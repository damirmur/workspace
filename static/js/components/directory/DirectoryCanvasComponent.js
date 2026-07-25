// static/js/components/directory/DirectoryCanvasComponent.js
import { BaseCanvasComponent } from '../BaseCanvasComponent.js';
import { DirectoryHeaderComponent } from './DirectoryHeaderComponent.js';
import { DirectoryRowsComponent } from './DirectoryRowsComponent.js';
import { DirectoryFormComponent } from './DirectoryFormComponent.js'; // Импортируем форму карточки

export class DirectoryCanvasComponent extends BaseCanvasComponent {
  constructor(entity, tabContext, onUpdate, onDelete) {
    // Пробрасываем базовые параметры в родительский класс
    super(entity, onUpdate, onDelete);

    this.tab = tabContext; // Сохраняем контекст текущей вкладки (Tabs OS)
    this.app = window.appInstance; // Ссылка на глобальный оркестратор приложения

    // Инициализация структуры данных справочника по умолчанию
    if (!this.entity.columns) this.entity.columns = ['Название', 'Описание'];
    if (!this.entity.columnTypes) {
      this.entity.columnTypes = {};
      this.entity.columns.forEach(col => { this.entity.columnTypes[col] = 'TEXT'; });
    }
    if (!this.entity.rows) this.entity.rows = [];
    if (!this.entity.relationTargets) this.entity.relationTargets = {}; // Карта связей для колонок

    // Локальное состояние поисковой строки вкладки
    this.searchQuery = '';

    // Инициализируем сателлиты для табличного режима
    this.headerComponent = new DirectoryHeaderComponent(this);
    this.rowsComponent = new DirectoryRowsComponent(this);
  }

  /**
   * Полнотекстовый поиск по всем типам полей в памяти
   */
  getFilteredRows() {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) return this.entity.rows;

    return this.entity.rows.filter(row => {
      return this.entity.columns.some(colName => {
        const cellValue = row[colName];
        if (!cellValue) return false;

        const type = this.entity.columnTypes[colName] || 'TEXT';

        // Специфический поиск в зависимости от структуры данных поля
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
    // ВЕТВЛЕНИЕ ИНТЕРФЕЙСА: Если вкладка переведена в режим карточки, рендерим форму элемента
    if (this.tab.viewMode === 'form') {
      const formComponent = new DirectoryFormComponent(this, this.tab);
      return formComponent.render();
    }

    // РЕЖИМ ТАБЛИЦЫ (По умолчанию)
    const wrapper = document.createElement('div');
    wrapper.className = 'directory-workspace';
    wrapper.style.cssText = 'display:flex; flex-direction:column; height:100%;';

    wrapper.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap:wrap; gap:10px;">
        <h2 id="directory-title-text" style="margin:0; padding:4px; border-radius:4px;">🗂️ ${this.entity.title}</h2>
        <div style="display:flex; gap:10px;">
          <button id="add-column-btn" style="padding: 8px 12px; background:#6c757d; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.85rem;">+ Колонка</button>
          <button id="add-row-form-btn" style="padding: 8px 12px; background:#28a745; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.85rem;">+ Создать в форме</button>
          <button id="dir-delete-btn" style="padding: 8px 12px; background:#dc3545; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.85rem;">Удалить справочник</button>
        </div>
      </div>

      <!-- Панель интерактивного поиска -->
      <div class="search-panel" style="margin-bottom: 15px;">
        <input type="text" id="dir-search-input" placeholder="Поиск по всем ячейкам справочника..." 
               value="${this.searchQuery}" 
               style="width:100%; padding:10px; font-size:0.95rem; border:1px solid #cbd5e1; border-radius:4px; box-sizing:border-box;">
      </div>

      <!-- Табличный блок -->
      <div class="table-scroll-container" style="overflow-x:auto; flex-grow:1; border:1px solid #e2e8f0; border-radius:4px;">
        <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
          <thead><tr id="table-head-row"></tr></thead>
          <tbody id="table-body"></tbody>
        </table>
      </div>
    `;

    // Делегируем сборку шапки таблицы сателлиту
    this.headerComponent.render(wrapper.querySelector('#table-head-row'));

    // Рендерим строки (в следующем шаге сюда подключится Виртуальный Скролл)
    const tableBody = wrapper.querySelector('#table-body');
    this.rowsComponent.render(tableBody, this.getFilteredRows());

    // Интерактивный поиск "на лету" без потери фокуса клавиатуры
    const searchInput = wrapper.querySelector('#dir-search-input');
    searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.rowsComponent.render(tableBody, this.getFilteredRows());
    });

    // Инлайновое изменение названия самого справочника
    const titleHeader = wrapper.querySelector('#directory-title-text');
    if (titleHeader) {
      this.makeEditable(titleHeader, (newTitle) => {
        this.entity.title = newTitle.replace(/^🗂️\s*/, '');
        this.onUpdate(this.entity);
      });
    }

    // Слушатели кнопок верхнего меню
    wrapper.querySelector('#add-column-btn').addEventListener('click', () => {
      const name = prompt('Введите название новой колонки:');
      if (name && !this.entity.columns.includes(name)) {
        this.entity.columns.push(name);

        // По умолчанию выставляем тип TEXT
        this.entity.columnTypes[name] = 'TEXT';
        this.saveAndRefresh();
      }
    });

    // Кнопка "+ Создать в форме" переключает ТЕКУЩУЮ вкладку в режим 'form' с targetRowId = null
    wrapper.querySelector('#add-row-form-btn').addEventListener('click', () => {
      // Вместо мгновенного пуша пустой строки, мы просто переводим вкладку в режим создания формы.
      // Сама форма DirectoryFormComponent в своем конструкторе сгенерирует кристально чистый row ID.
      this.tab.viewMode = 'form';
      this.tab.targetRowId = null; // Сигнал, что это НОВЫЙ элемент
      this.saveAndRefresh();
    });

    wrapper.querySelector('#dir-delete-btn').addEventListener('click', () => {
      if (confirm(`Вы уверены, что хотите удалить весь справочник "${this.entity.title}"?`)) {
        this.onDelete(this.entity.id);
      }
    });

    return wrapper;
  }

  /**
   * ООП-метод принудительной синхронизации стейта и обновления экрана через TabsManager
   */
  saveAndRefresh() {
    this.onUpdate(this.entity); // Запускаем фоновый дебаунс на Go-сервер
    if (this.app && this.app.tabsManager) {
      this.app.tabsManager.renderCanvasContent(); // Перерисовываем активный Canvas вкладок
    }
  }
}
