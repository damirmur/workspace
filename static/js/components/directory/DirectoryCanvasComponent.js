// static/js/components/directory/DirectoryCanvasComponent.js
import { BaseCanvasComponent } from '../BaseCanvasComponent.js';
import { DirectoryHeaderComponent } from './DirectoryHeaderComponent.js';
import { DirectoryRowsComponent } from './DirectoryRowsComponent.js';
import { DirectoryFormComponent } from './DirectoryFormComponent.js';
import { DirectoryExchangeService } from './DirectoryExchangeService.js'; // ИМПОРТ СЕРВИСА

export class DirectoryCanvasComponent extends BaseCanvasComponent {
  constructor(entity, tabContext, onUpdate, onDelete) {
    super(entity, onUpdate, onDelete);
    
    this.tab = tabContext; 
    this.app = window.appInstance; 

    // Инициализация структуры данных по умолчанию
    if (!this.entity.columns) this.entity.columns = ['Название', 'Описание'];
    if (!this.entity.columnTypes) {
      this.entity.columnTypes = {};
      this.entity.columns.forEach(col => { this.entity.columnTypes[col] = 'TEXT'; });
    }
    if (!this.entity.rows) this.entity.rows = [];
    if (!this.entity.relationTargets) this.entity.relationTargets = {};

    this.searchQuery = '';

    // Подключаем дочерние компоненты и выделенный сервис обмена данными
    this.headerComponent = new DirectoryHeaderComponent(this);
    this.rowsComponent = new DirectoryRowsComponent(this);
    this.exchangeService = new DirectoryExchangeService(this); // Инициализация сервиса
  }

  getFilteredRows() {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) return this.entity.rows;

    return this.entity.rows.filter(row => {
      return this.entity.columns.some(colName => {
        const cellValue = row[colName];
        if (!cellValue) return false;

        const type = this.entity.columnTypes[colName] || 'TEXT';
        if (type === 'TIMESTAMP' && cellValue.utc) {
          return new Date(cellValue.utc).toLocaleString().toLowerCase().includes(query);
        }
        if (type === 'JSON') return JSON.stringify(cellValue).toLowerCase().includes(query);
        if (type === 'ZIP_FILE' && cellValue.fileName) return cellValue.fileName.toLowerCase().includes(query);
        
        return String(cellValue).toLowerCase().includes(query);
      });
    });
  }

  render() {
    if (this.tab.viewMode === 'form') {
      const formComponent = new DirectoryFormComponent(this, this.tab);
      return formComponent.render();
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'directory-workspace';
    wrapper.style.cssText = 'display:flex; flex-direction:column; height:100%;';
    
    wrapper.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap:wrap; gap:10px;">
        <h2 id="directory-title-text" style="margin:0; padding:4px; border-radius:4px;">🗂️ ${this.entity.title}</h2>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button id="add-column-btn" style="padding: 6px 12px; background:#64748b; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.85rem;">+ Колонка</button>
          <button id="add-row-form-btn" style="padding: 6px 12px; background:#10b981; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.85rem;">+ Создать в форме</button>
          
          <!-- КНОПКИ СЕРВИСА ЭКСПОРТА И ИМПОРТА -->
          <button id="json-export-btn" style="padding: 6px 12px; background:#4f46e5; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.85rem;" title="Скачать таблицу в JSON">📥 Экспорт JSON</button>
          <button id="json-import-btn" style="padding: 6px 12px; background:#0ea5e9; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.85rem;" title="Загрузить таблицу из JSON">📤 Импорт JSON</button>
          <!-- Скрытый технический инпут для выбора файла компьютером -->
          <input type="file" id="json-file-picker" accept=".json" style="display:none;">

          <button id="dir-delete-btn" style="padding: 6px 12px; background:#ef4444; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.85rem;">Удалить</button>
        </div>
      </div>

      <div class="search-panel" style="margin-bottom: 15px;">
        <input type="text" id="dir-search-input" placeholder="Поиск по всем ячейкам справочника..." value="${this.searchQuery}" style="width:100%; padding:10px; font-size:0.95rem; border:1px solid #cbd5e1; border-radius:4px; box-sizing:border-box;">
      </div>

      <div class="table-scroll-container" style="overflow-x:auto; flex-grow:1; border:1px solid #e2e8f0; border-radius:4px;">
        <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
          <thead><tr id="table-head-row"></tr></thead>
          <tbody id="table-body"></tbody>
        </table>
      </div>
    `;

    // Рендеринг сателлитов
    this.headerComponent.render(wrapper.querySelector('#table-head-row'));
    const tableBody = wrapper.querySelector('#table-body');
    this.rowsComponent.render(tableBody, this.getFilteredRows());

    // Слушатель поиска
    const searchInput = wrapper.querySelector('#dir-search-input');
    searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.rowsComponent.render(tableBody, this.getFilteredRows());
    });

    // Изменение заголовка справочника
    const titleHeader = wrapper.querySelector('#directory-title-text');
    if (titleHeader) {
      this.makeEditable(titleHeader, (newTitle) => {
        this.entity.title = newTitle.replace(/^🗂️\s*/, '');
        this.onUpdate(this.entity);
      });
    }

    // Привязка методов Сервиса Импорта/Экспорта к интерфейсу
    wrapper.querySelector('#json-export-btn').addEventListener('click', () => {
      this.exchangeService.exportToJSON();
    });

    const filePicker = wrapper.querySelector('#json-file-picker');
    wrapper.querySelector('#json-import-btn').addEventListener('click', () => {
      filePicker.click(); // Имитируем клик по скрытому инпуту файла
    });

    filePicker.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.exchangeService.importFromJSON(file);
        filePicker.value = ""; // Сбрасываем инпут, чтобы можно было загрузить тот же файл повторно
      }
    });

    // Остальные кнопки меню
    wrapper.querySelector('#add-column-btn').addEventListener('click', () => {
      const name = prompt('Введите название новой колонки:');
      if (name && !this.entity.columns.includes(name)) {
        this.entity.columns.push(name);
        this.entity.columnTypes[name] = 'TEXT';
        this.saveAndRefresh();
      }
    });

    wrapper.querySelector('#add-row-form-btn').addEventListener('click', () => {
      this.tab.viewMode = 'form';
      this.tab.targetRowId = null;
      this.saveAndRefresh();
    });

    wrapper.querySelector('#dir-delete-btn').addEventListener('click', () => {
      if (confirm(`Удалить весь справочник "${this.entity.title}"?`)) this.onDelete(this.entity.id);
    });

    return wrapper;
  }

  saveAndRefresh() {
    this.onUpdate(this.entity);
    if (this.app && this.app.tabsManager) {
      this.app.tabsManager.renderCanvasContent();
    }
  }
}
