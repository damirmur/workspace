// static/js/components/directory/table/DirectoryTableToolbar.js
import { DirectoryVisibilityModal } from './DirectoryVisibilityModal.js';
import { DirectoryLinkModal } from './DirectoryLinkModal.js';

export class DirectoryTableToolbar {
  constructor(canvasContext) {
    this.ctx = canvasContext;
    
    // Подключаем выделенные модальные под-компоненты
    this.visibilityModal = new DirectoryVisibilityModal(this.ctx);
    this.linkModal = new DirectoryLinkModal(this.ctx);
  }

  render(containerElement) {
    const isSubTable = !!this.ctx.tab.ownerContext;

    containerElement.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; width:100%; flex-wrap:wrap; gap:10px;">
        <h2 id="directory-title-text" style="margin:0; padding:4px; font-size:${isSubTable ? '1.1rem' : '1.4rem'}; color:#1e293b;">
          🗂️ ${this.ctx.entity.title}
        </h2>
        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
          <button id="view-type-toggle-btn" style="padding: 6px 12px; background:#f1f5f9; color:#0f172a; border:1px solid #cbd5e1; border-radius:4px; cursor:pointer; font-size:0.8rem; font-weight:600;">
            ${this.ctx.viewType === 'table' ? '🌲 Дерево' : '📋 Таблица'}
          </button>
          
          ${!isSubTable ? '<button id="cols-visibility-btn" style="padding: 6px 12px; background:#f1f5f9; color:#1e293b; border:1px solid #cbd5e1; border-radius:4px; cursor:pointer; font-size:0.8rem;">👁️ Видимость</button>' : ''}
          ${!isSubTable ? '<button id="add-column-btn" style="padding: 6px 12px; background:#64748b; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.8rem;">+ Колонку</button>' : ''}
          
          <button id="add-row-form-btn" style="padding: 6px 12px; background:#10b981; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.8rem;">+ Создать</button>
          ${isSubTable ? '<button id="link-existing-btn" style="padding: 6px 12px; background:#0ea5e9; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.8rem;">🔗 Привязать из базы</button>' : ''}

          ${!isSubTable ? `
            <button id="relations-config-btn" style="padding: 6px 12px; background:#e2e8f0; color:#1e293b; border:1px solid #cbd5e1; border-radius:4px; cursor:pointer; font-size:0.8rem;">⚙️ Связи</button>
            <button id="json-export-btn" style="padding: 6px 12px; background:#4f46e5; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.8rem;">📥 Экспорт</button>
            <button id="json-import-btn" style="padding: 6px 12px; background:#0ea5e9; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.8rem;">📤 Импорт</button>
            <input type="file" id="json-file-picker" accept=".json" style="display:none;">
            <button id="dir-delete-btn" style="padding: 6px 12px; background:#ef4444; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.8rem;">Удалить</button>
          ` : ''}
        </div>
      </div>
    `;

    containerElement.querySelector('#view-type-toggle-btn').addEventListener('click', () => {
      this.ctx.viewType = this.ctx.viewType === 'table' ? 'tree' : 'table';
      this.ctx.tab.viewType = this.ctx.viewType;
      this.ctx.saveAndRefresh(); 
    });

    containerElement.querySelector('#add-row-form-btn').addEventListener('click', () => {
      this.ctx.app.tabsManager.openTab({
        id: crypto.randomUUID(),
        entityId: this.ctx.entity.id,
        title: `${this.ctx.entity.title}: Новый`, 
        type: 'directory',
        viewMode: 'form',
        targetRowId: null,
        ownerContext: this.ctx.tab.ownerContext || null 
      });
    });

    if (!isSubTable) {
      containerElement.querySelector('#cols-visibility-btn').addEventListener('click', () => this.visibilityModal.open());
    }

    if (isSubTable) {
      containerElement.querySelector('#link-existing-btn').addEventListener('click', () => this.linkModal.open());
    }

    const titleHeader = containerElement.querySelector('#directory-title-text');
    if (titleHeader) {
      this.ctx.makeEditable(titleHeader, (newTitle) => {
        this.ctx.entity.title = newTitle.replace(/^🗂️\s*/, '');
        this.ctx.onUpdate(this.ctx.entity);
      });
    }

    if (!isSubTable) {
      containerElement.querySelector('#relations-config-btn').addEventListener('click', () => this.ctx.relationsModal.open());
      containerElement.querySelector('#json-export-btn').addEventListener('click', () => this.ctx.exchangeService.exportToJSON());
      
      const filePicker = containerElement.querySelector('#json-file-picker');
      containerElement.querySelector('#json-import-btn').addEventListener('click', () => filePicker.click());
      
      filePicker.addEventListener('change', (e) => {
        if (e.target.files && e.target.files) {
          this.ctx.exchangeService.importFromJSON(e.target.files);
          filePicker.value = "";
        }
      });

      containerElement.querySelector('#add-column-btn').addEventListener('click', () => {
        const name = prompt('Введите название новой колонки:');
        if (name && !this.ctx.entity.columns.includes(name)) {
          this.ctx.entity.columns.push(name);
          this.ctx.entity.columnTypes[name] = 'TEXT';
          this.ctx.saveAndRefresh(); 
        }
      });

      containerElement.querySelector('#dir-delete-btn').addEventListener('click', () => {
        if (confirm('Вы уверены, что хотите удалить весь справочник?')) this.ctx.onDelete(this.ctx.entity.id);
      });
    }
  }
}
