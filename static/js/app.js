// static/js/app.js
import { DatabaseManager, EntityRepository } from './db.js';
import { CanvasUIFactory } from './components/CanvasUIFactory.js';

const SyncStatus = {
  SYNCED: { class: 'synced', icon: '●', text: 'Облако' },
  SYNCING: { class: 'syncing', icon: '↻', text: 'Синхронизация...' },
  OFFLINE: { class: 'offline', icon: '○', text: 'Оффлайн' }
};

class WorkspaceApp {
  constructor() {
    this.workspaceId = 1;
    this.entities = [];
    this.selectedEntity = null;
    this.dbManager = new DatabaseManager('WorkspaceDB', 1);
    this.repository = new EntityRepository(this.dbManager);
    this.dom = {};
    this.debounceTimer = null;
    window.serverTimezones = [{ name: "UTC", offset: "+00:00" }];
  }

  async init() {
    this.dom = {
      title: document.getElementById('workspace-title'),
      list: document.getElementById('entity-list'),
      canvas: document.getElementById('workspace-canvas'),
      syncStatus: document.getElementById('sync-status')
    };

    for (const [key, element] of Object.entries(this.dom)) {
      if (!element) {
        console.error(`Критическая ошибка: Элемент DOM для '${key}' не найден!`);
        return; 
      }
    }

    await this.dbManager.connect();
    this.dom.title.textContent = `Пространство #${this.workspaceId}`;
    
    this.initCloseSynchronization();
    await this.loadServerTimezones();
    await this.syncPull();
    await this.loadEntities(); 
  }

    async loadServerTimezones() {
    try {
      const response = await fetch('/api/timezones');
      if (response.ok) {
        window.serverTimezones = await response.json();
        console.log('Часовые пояса с Ubuntu успешно загружены');
      }
    } catch (err) {
      console.warn('Не удалось загрузить зоны с сервера, используем UTC по умолчанию', err);
    }
  }

  updateSyncStatus(status) {
    const el = this.dom.syncStatus;
    el.className = `sync-badge ${status.class}`;
    el.querySelector('.sync-icon').textContent = status.icon;
    el.querySelector('.sync-text').textContent = status.text;
  }

  async syncPull() {
    this.updateSyncStatus(SyncStatus.SYNCING);
    try {
      const response = await fetch('/api/sync/pull');
      const serverEntities = await response.json();
      if (serverEntities && serverEntities.length > 0) {
        await this.repository.clearAll();
        for (const entity of serverEntities) {
          await this.repository.save(entity);
        }
      }
      this.updateSyncStatus(SyncStatus.SYNCED);
    } catch (err) {
      this.updateSyncStatus(SyncStatus.OFFLINE);
    }
  }

  async syncPush() {
    this.updateSyncStatus(SyncStatus.SYNCING);
    try {
      const localEntities = await this.repository.getAllEntities();
      const response = await fetch('/api/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localEntities)
      });
      if (response.ok) this.updateSyncStatus(SyncStatus.SYNCED);
      else this.updateSyncStatus(SyncStatus.OFFLINE);
    } catch (err) {
      this.updateSyncStatus(SyncStatus.OFFLINE);
    }
  }

  syncPushDebounced() {
    this.updateSyncStatus({ class: 'syncing', icon: '↻', text: 'Ожидание паузы...' });
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.syncPush();
    }, 1000);
  }

  async loadEntities() {
    this.entities = await this.repository.getByWorkspace(this.workspaceId);
    this.renderSidebar();
  }

  renderSidebar() {
    this.dom.list.innerHTML = '';

    // Группы, включая Справочники
    const groups = {
      note: { title: '📝 Заметки', defaultName: 'Новая заметка', defaultData: { content: '' }, items: [] },
      project: { title: '📁 Проекты', defaultName: 'Новый проект', defaultData: { tasks: [] }, items: [] },
      directory: { title: '🗂️ Справочники', defaultName: 'Новый справочник', defaultData: { columns: ['Название', 'Описание'], rows: [] }, items: [] }
    };

    // Сортируем элементы по группам
    this.entities.forEach(entity => {
      if (groups[entity.type]) {
        groups[entity.type].items.push(entity);
      }
    });

    // Рендерим каждую группу
    for (const [type, group] of Object.entries(groups)) {
      // Заголовок группы теперь создается ВСЕГДА (даже если пустой), чтобы была кнопка "+"
      const groupHeader = document.createElement('div');
      groupHeader.className = 'group-header';
      groupHeader.innerHTML = `
        <span>${group.title}</span>
        <button class="add-group-item-btn" title="Добавить элемент">→</button>
      `;
      
      // Клик по кнопке "+" внутри группы
      groupHeader.querySelector('.add-group-item-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.createNewEntity(type, { title: group.defaultName, ...group.defaultData });
      });
      
      this.dom.list.appendChild(groupHeader);

      // Рендерим элементы группы
      group.items.forEach(entity => {
        const li = document.createElement('li');
        li.className = 'entity-item';
        if (this.selectedEntity && this.selectedEntity.id === entity.id) {
          li.classList.add('active');
        }
        li.textContent = entity.title;
        li.dataset.id = entity.id;

        li.addEventListener('click', () => this.selectEntity(entity));
        this.dom.list.appendChild(li);
      });
    }
  }

  selectEntity(entity) {
    this.selectedEntity = entity;
    
    this.dom.list.querySelectorAll('.entity-item').forEach(li => li.classList.remove('active'));
    const activeLi = this.dom.list.querySelector(`.entity-item[data-id="${entity.id}"]`);
    if (activeLi) activeLi.classList.add('active');

    this.dom.canvas.innerHTML = '';
    
    const component = CanvasUIFactory.create(
      entity, 
      (ent) => this.updateEntity(ent),
      (id) => this.deleteEntity(id)
    );
    this.dom.canvas.appendChild(component.render());
  }

  async createNewEntity(type, rawData) {
    const newEntityData = {
      workspaceId: this.workspaceId,
      type: type,
      title: rawData.title,
      createdAt: Date.now(),
      ...rawData
    };

    const savedId = await this.repository.save(newEntityData);
    newEntityData.id = savedId;

    this.entities.push(newEntityData);
    this.renderSidebar();
    this.selectEntity(newEntityData);
    this.syncPush();
  }

  async updateEntity(updatedEntity) {
    await this.repository.save(updatedEntity);
    const listItem = this.dom.list.querySelector(`.entity-item[data-id="${updatedEntity.id}"]`);
    if (listItem) {
      listItem.textContent = updatedEntity.title;
    }
    this.syncPushDebounced(); 
  }

  async deleteEntity(id) {
    await this.repository.delete(id);
    this.entities = this.entities.filter(ent => ent.id !== id);
    
    if (this.selectedEntity && this.selectedEntity.id === id) {
      this.selectedEntity = null;
      this.dom.canvas.innerHTML = '<div id="empty-state">Выберите сущность слева, чтобы начать работу</div>';
    }

    this.renderSidebar();
    clearTimeout(this.debounceTimer);
    this.syncPush();
  }

  initCloseSynchronization() {
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'hidden') {
        const localEntities = await this.repository.getAllEntities();
        const blob = new Blob([JSON.stringify(localEntities)], { type: 'application/json' });
        navigator.sendBeacon('/api/sync/push', blob);
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new WorkspaceApp();
  app.init();
});