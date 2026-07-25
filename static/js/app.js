// static/js/app.js
import { DatabaseManager, EntityRepository } from './db.js';
import { CanvasUIFactory } from './components/CanvasUIFactory.js';
import { TabsManager } from './tabs/TabsManager.js'; // Импортируем Менеджер Вкладок

const SyncStatus = {
  SYNCED: { class: 'synced', icon: '●', text: 'Облако' },
  SYNCING: { class: 'syncing', icon: '↻', text: 'Синхронизация...' },
  OFFLINE: { class: 'offline', icon: '○', text: 'Оффлайн' }
};

class WorkspaceApp {
  constructor() {
    this.workspaceId = 1;
    this.entities = [];
    this.selectedEntity = null; // Текущая сущность, привязанная к активной вкладке
    
    this.dbManager = new DatabaseManager('WorkspaceDB', 1);
    this.repository = new EntityRepository(this.dbManager);
    this.canvasFactory = CanvasUIFactory; // Ссылка на фабрику UI-компонентов
    
    this.dom = {};
    this.debounceTimer = null;
    this.tabsManager = null; // Будет инициализирован в init()
    
    // Инициализируем пустой массив часовых поясов (подгрузится с Go-сервера Ubuntu)
    window.serverTimezones = [{ name: "UTC", offset: "+00:00" }];
  }

  async init() {
    this.dom = {
      title: document.getElementById('workspace-title'),
      list: document.getElementById('entity-list'),
      tabsBar: document.getElementById('tabs-bar'),       // Контейнер полосы вкладок
      canvas: document.getElementById('workspace-canvas'), // Контейнер холста
      syncStatus: document.getElementById('sync-status')
    };

    for (const [key, element] of Object.entries(this.dom)) {
      if (!element) {
        console.error(`Критическая ошибка: Элемент DOM для '${key}' не найден в index.html!`);
        return; 
      }
    }

    // Инициализируем Менеджер Вкладок (Mediator)
    this.tabsManager = new TabsManager(this, this.dom.tabsBar, this.dom.canvas);

    await this.dbManager.connect();
    this.dom.title.textContent = `Пространство #${this.workspaceId}`;
    
    this.initCloseSynchronization();
    await this.loadServerTimezones(); // Подгружаем таймзоны Ubuntu
    await this.syncPull();            // Подтягиваем данные из бэкапа Go
    await this.loadEntities();        // Загружаем сущности в память и строим сайдбар
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

    // Структурированные группы с дефолтными конфигурациями полей
    const groups = {
      note: { title: '📝 Заметки', defaultName: 'Новая заметка', defaultData: { content: '' }, items: [] },
      project: { title: '📁 Проекты', defaultName: 'Новый проект', defaultData: { tasks: [] }, items: [] },
      directory: { title: '🗂️ Справочники', defaultName: 'Новый справочник', defaultData: { columns: ['Название', 'Описание'], columnTypes: { 'Название': 'TEXT', 'Описание': 'TEXT' }, rows: [] }, items: [] },
      skill: { title: '🤖 Роботы-скиллы', defaultName: 'Новый робот', defaultData: { script: '' }, items: [] }
    };

    this.entities.forEach(entity => {
      if (groups[entity.type]) {
        groups[entity.type].items.push(entity);
      }
    });

    for (const [type, group] of Object.entries(groups)) {
      const groupHeader = document.createElement('div');
      groupHeader.className = 'group-header';
      groupHeader.innerHTML = `
        <span>${group.title}</span>
        <button class="add-group-item-btn" title="Создать новый элемент">+</button>
      `;
      
      groupHeader.querySelector('.add-group-item-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.createNewEntity(type, { title: group.defaultName, ...group.defaultData });
      });
      
      this.dom.list.appendChild(groupHeader);

      group.items.forEach(entity => {
        const li = document.createElement('li');
        li.className = 'entity-item';
        li.textContent = entity.title;
        li.dataset.id = entity.id;

        // При клике на сущность в сайдбаре — просим TabsManager открыть для неё вкладку-таблицу
        li.addEventListener('click', () => {
          this.tabsManager.openTab({
            entityId: entity.id,
            title: entity.title,
            type: entity.type,
            viewMode: 'table' // По умолчанию открываем как таблицу/список
          });
        });
        this.dom.list.appendChild(li);
      });
    }

    // Подсвечиваем активный элемент в сайдбаре, если вкладки уже открыты
    this.syncSidebarActiveState();
  }

  // Метод синхронизации класса .active в сайдбаре на основе активной вкладки
  syncSidebarActiveState() {
    this.dom.list.querySelectorAll('.entity-item').forEach(li => li.classList.remove('active'));
    if (this.selectedEntity) {
      const activeLi = this.dom.list.querySelector(`.entity-item[data-id="${this.selectedEntity.id}"]`);
      if (activeLi) activeLi.classList.add('active');
    }
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
    
    // Сразу открываем только что созданную сущность в Менеджере Вкладок
    this.tabsManager.openTab({
      entityId: newEntityData.id,
      title: newEntityData.title,
      type: newEntityData.type,
      viewMode: 'table'
    });

    this.syncPush();
  }

  async updateEntity(updatedEntity) {
    await this.repository.save(updatedEntity);
    
    // Обновляем текст заголовка вкладки, если сущность переименовали
    const activeTab = this.tabsManager.tabs.find(t => t.entityId === updatedEntity.id);
    if (activeTab && activeTab.viewMode === 'table') {
      activeTab.title = updatedEntity.title;
      this.tabsManager.renderTabBar();
    }

    // Обновляем текст в сайдбаре
    const listItem = this.dom.list.querySelector(`.entity-item[data-id="${updatedEntity.id}"]`);
    if (listItem) {
      listItem.textContent = updatedEntity.title;
    }

    this.syncPushDebounced(); 
  }

  async deleteEntity(id) {
    await this.repository.delete(id);
    this.entities = this.entities.filter(ent => ent.id !== id);
    
    // Находим все вкладки, связанные с удаленной сущностью, и закрываем их
    const tabsToClose = this.tabsManager.tabs.filter(t => t.entityId === id);
    tabsToClose.forEach(t => this.tabsManager.closeTab(t.id));

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

// Запуск и регистрация глобального инстанса для реляционных полей связи
document.addEventListener('DOMContentLoaded', () => {
  const app = new WorkspaceApp();
  app.init();
  window.appInstance = app; 
});
