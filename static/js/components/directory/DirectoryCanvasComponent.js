// static/js/components/directory/DirectoryCanvasComponent.js
import { BaseCanvasComponent } from '../BaseCanvasComponent.js';
import { DirectoryHeaderComponent } from './DirectoryHeaderComponent.js';
import { DirectoryRowsComponent } from './DirectoryRowsComponent.js';

export class DirectoryCanvasComponent extends BaseCanvasComponent {
  constructor(entity, onUpdate, onDelete) {
    super(entity, onUpdate, onDelete);
    
    // Инициализация дефолтной структуры данных справочника
    if (!this.entity.columns) this.entity.columns = ['Название', 'Описание'];
    if (!this.entity.columnTypes) {
      this.entity.columnTypes = {};
      this.entity.columns.forEach(col => { this.entity.columnTypes[col] = 'TEXT'; });
    }
    if (!this.entity.rows) this.entity.rows = [];

    // Локальное стейт-состояние строки поиска
    this.searchQuery = '';

    // Инициализируем подчиненные компоненты-сателлиты
    this.headerComponent = new DirectoryHeaderComponent(this);
    this.rowsComponent = new DirectoryRowsComponent(this);
  }

  // Метод фильтрации строк на основе запроса
  getFilteredRows() {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) return this.entity.rows;

    return this.entity.rows.filter(row => {
      return this.entity.columns.some(colName => {
        const cellValue = row[colName];
        if (!cellValue) return false;

        // Фильтрация в зависимости от структуры типа ячейки
        const type = this.entity.columnTypes[colName] || 'TEXT';
        if (type === 'TIMESTAMP' && cellValue.utc) {
          return new Date(cellValue.utc).toLocaleString().toLowerCase().includes(query);
        }
        if (type === 'JSON') {
          return JSON.stringify(cellValue).toLowerCase().includes(query);
        }
        if (type === 'ZIP_FILE' && cellValue.fileName) {
          return cellValue.fileName.toLowerCase().includes(query);
        }
        
        return String(cellValue).toLowerCase().includes(query);
      });
    });
  }

  render() {
    const wrapper = document.createElement('div');
    wrapper.className = 'directory-workspace';
    
    wrapper.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap:wrap; gap:10px;">
        <h2 id="directory-title-text" style="margin:0; padding:4px; border-radius:4px;">🗂️ ${this.entity.title}</h2>
        <div style="display:flex; gap:10px;">
          <button id="add-column-btn" style="padding: 8px 12px; background:#6c757d; color:white; border:none; border-radius:4px; cursor:pointer;">+ Колонка</button>
          <button id="add-row-btn" style="padding: 8px 12px; background:#007bff; color:white; border:none; border-radius:4px; cursor:pointer;">+ Строка</button>
          <button id="dir-delete-btn" style="padding: 8px 12px; background:#dc3545; color:white; border:none; border-radius:4px; cursor:pointer;">Удалить</button>
        </div>
      </div>

      <!-- Встроенная панель интерактивного поиска -->
      <div class="search-panel" style="margin-bottom: 20px;">
        <input type="text" id="dir-search-input" placeholder="Поиск по всем колонкам справочника..." 
               value="${this.searchQuery}" 
               style="width:100%; padding:10px; font-size:1rem; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
      </div>

      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; font-size:0.95rem;">
          <thead><tr id="table-head-row"></tr></thead>
          <tbody id="table-body"></tbody>
        </table>
      </div>
    `;

    // Делегируем рендеринг шапки и строк выделенным под-компонентам
    this.headerComponent.render(wrapper.querySelector('#table-head-row'));
    this.rowsComponent.render(wrapper.querySelector('#table-body'), this.getFilteredRows());

    // Слушатель поиска (Обновляет строки "на лету" без сброса фокуса ввода)
    const searchInput = wrapper.querySelector('#dir-search-input');
    searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      // Чтобы не перерисовывать весь холст и не терять фокус из инпута поиска,
      // вызываем перерисовку только у строк
      this.rowsComponent.render(wrapper.querySelector('#table-body'), this.getFilteredRows());
    });

    // Инлайновое переименование справочника
    const titleHeader = wrapper.querySelector('#directory-title-text');
    if (titleHeader) {
      this.makeEditable(titleHeader, (newTitle) => {
        this.entity.title = newTitle.replace(/^🗂️\s*/, '');
        this.onUpdate(this.entity);
      });
    }

    // Слушатели кнопок верхнего меню
    wrapper.querySelector('#add-column-btn').addEventListener('click', () => {
      const name = prompt('Имя новой колонки:');
      if (name && !this.entity.columns.includes(name)) {
        this.entity.columns.push(name);
        this.entity.columnTypes[name] = 'TEXT';
        this.saveAndRefresh();
      }
    });

    wrapper.querySelector('#add-row-btn').addEventListener('click', () => {
      const row = {};
      this.entity.columns.forEach(c => { 
        row[c] = this.entity.columnTypes[c] === 'BOOLEAN' ? false : ''; 
      });
      this.entity.rows.push(row);
      this.saveAndRefresh();
    });

    wrapper.querySelector('#dir-delete-btn').addEventListener('click', () => {
      if (confirm(`Удалить весь справочник "${this.entity.title}"?`)) {
        this.onDelete(this.entity.id);
      }
    });

    return wrapper;
  }

  saveAndRefresh() {
    this.onUpdate(this.entity);
    const canvas = document.getElementById('workspace-canvas');
    if (canvas) {
      canvas.innerHTML = '';
      canvas.appendChild(this.render());
    }
  }
}
