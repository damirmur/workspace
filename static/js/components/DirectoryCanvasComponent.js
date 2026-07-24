// static/js/components/DirectoryCanvasComponent.js
import { BaseCanvasComponent } from './BaseCanvasComponent.js';
import { FieldTypes } from '../fields/FieldRegistry.js'; // Импортируем типы

export class DirectoryCanvasComponent extends BaseCanvasComponent {
    constructor(entity, onUpdate, onDelete) {
        super(entity, onUpdate, onDelete);
        if (!this.entity.columns) this.entity.columns = ['Название', 'Описание'];
        // Храним маппинг: имя_колонки -> тип (по умолчанию TEXT)
        if (!this.entity.columnTypes) {
            this.entity.columnTypes = {};
            this.entity.columns.forEach(col => { this.entity.columnTypes[col] = 'TEXT'; });
        }
        if (!this.entity.rows) this.entity.rows = [];
    }

    render() {
        const wrapper = document.createElement('div');
        wrapper.className = 'directory-workspace';

        wrapper.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h2 id="directory-title-text" style="margin:0; padding:4px; border-radius:4px;">🗂️ ${this.entity.title}</h2>
        <div style="display:flex; gap:10px;">
          <button id="add-column-btn" style="padding: 8px 12px; background:#6c757d; color:white; border:none; border-radius:4px; cursor:pointer;">+ Колонка</button>
          <button id="add-row-btn" style="padding: 8px 12px; background:#007bff; color:white; border:none; border-radius:4px; cursor:pointer;">+ Строка</button>
          <button id="dir-delete-btn" style="padding: 8px 12px; background:#dc3545; color:white; border:none; border-radius:4px; cursor:pointer;">Удалить</button>
        </div>
      </div>
      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; margin-top:15px; font-size:0.95rem;">
          <thead><tr id="table-head-row"></tr></thead>
          <tbody id="table-body"></tbody>
        </table>
      </div>
    `;

        const headRow = wrapper.querySelector('#table-head-row');
        const tableBody = wrapper.querySelector('#table-body');

        // 1. Рендеринг шапки таблицы с возможностью СМЕНЫ ТИПА колонки
        this.entity.columns.forEach((colName, colIndex) => {
            const currentType = this.entity.columnTypes[colName] || 'TEXT';
            const th = document.createElement('th');
            th.style.cssText = 'background:#f1f3f5; border:1px solid #dee2e6; padding:10px; text-align:left; position:relative;';

            th.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:4px;">
          <span class="col-title" style="font-weight:bold;">${colName}</span>
          <select class="col-type-select" style="font-size:0.75rem; padding:2px;">
            <option value="TEXT" ${currentType === 'TEXT' ? 'selected' : ''}>Текст</option>
            <option value="NUMBER" ${currentType === 'NUMBER' ? 'selected' : ''}>Число</option>
            <option value="BOOLEAN" ${currentType === 'BOOLEAN' ? 'selected' : ''}>Чекбокс</option>
            <option value="TIMESTAMP" ${currentType === 'TIMESTAMP' ? 'selected' : ''}>Время (UTC)</option>
            <option value="JSON" ${currentType === 'JSON' ? 'selected' : ''}>JSON</option>
            <option value="ZIP_FILE" ${currentType === 'ZIP_FILE' ? 'selected' : ''}>ZIP Архив</option>
          </select>
        </div>
        <button class="del-col-btn" style="position:absolute; right:4px; top:4px; background:none; border:none; color:#dc3545; cursor:pointer; font-size:0.75rem;">✕</button>
      `;

            // Смена типа данных колонки
            th.querySelector('.col-type-select').addEventListener('change', (e) => {
                const selectedType = e.target.value;
                this.entity.columnTypes[colName] = selectedType;

                // Сбрасываем значения строк под дефолт структуры выбранного типа данных
                this.entity.rows.forEach(row => {
                    if (selectedType === 'BOOLEAN') row[colName] = false;
                    else if (selectedType === 'TIMESTAMP') row[colName] = { utc: Date.now(), offset: '+00:00' }; // Для времени инициализируем объект
                    else row[colName] = '';
                });

                // ТЕПЕРЬ ТУТ СТРЕЛОЧНАЯ ФУНКЦИЯ, ОШИБКА ИСЧЕЗЛА!
                this.saveAndRefresh();
            });

            // Переименование имени колонки
            this.makeEditable(th.querySelector('.col-title'), (newName) => {
                this.entity.columns[colIndex] = newName;
                this.entity.columnTypes[newName] = currentType;
                delete this.entity.columnTypes[colName];
                this.entity.rows.forEach(row => {
                    row[newName] = row[colName];
                    delete row[colName];
                });
                this.saveAndRefresh();
            });

            th.querySelector('.del-col-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Удалить колонку "${colName}"?`)) {
                    this.entity.columns.splice(colIndex, 1);
                    delete this.entity.columnTypes[colName];
                    this.entity.rows.forEach(row => delete row[colName]);
                    this.saveAndRefresh();
                }
            });

            headRow.appendChild(th);
        });

        // Техническая колонка действий
        const thAction = document.createElement('th');
        thAction.style.cssText = 'background:#f1f3f5; border:1px solid #dee2e6; width:40px;';
        headRow.appendChild(thAction);

        // 2. Рендеринг строк таблицы на базе фабрики полей
        this.entity.rows.forEach((row, rowIndex) => {
            const tr = document.createElement('tr');

            this.entity.columns.forEach(colName => {
                const td = document.createElement('td');
                td.style.cssText = 'border:1px solid #dee2e6; padding:10px; min-width:120px; cursor:pointer;';

                const type = this.entity.columnTypes[colName] || 'TEXT';
                const fieldProcessor = FieldTypes[type];

                // По умолчанию показываем ячейку в режиме просмотра View
                td.textContent = fieldProcessor.renderView(row[colName]);

                // По клику переключаем ячейку в режим редактирования Edit
                td.addEventListener('click', (e) => {
                    // КРИТИЧЕСКАЯ ПРОВЕРКА: Если внутри ячейки УЖЕ есть инпут, селектор или текстовая область,
                    // мы выходим, чтобы не сбрасывать фокус ввода и не ломать селектор зон!
                    if (td.querySelector('input') || td.querySelector('select') || td.querySelector('textarea')) {
                        return;
                    }

                    const type = this.entity.columnTypes[colName] || 'TEXT';
                    const fieldProcessor = FieldTypes[type];

                    td.innerHTML = '';

                    // Генерируем компонент редактирования
                    const editComponent = fieldProcessor.renderEdit(row[colName], (newValue) => {
                        row[colName] = newValue;
                        this.onUpdate(this.entity); // Фоновое сохранение через Debounce

                        // Потеря фокуса (blur) вернет ячейку в текстовый режим View
                        td.innerHTML = '';
                        td.textContent = fieldProcessor.renderView(newValue);
                    });

                    td.appendChild(editComponent);

                    // Автоматический фокус для текстовых полей
                    const innerInput = editComponent.querySelector('input[type="text"], input[type="number"], textarea');
                    if (innerInput) innerInput.focus();
                });

                tr.appendChild(td);
            });

            // Удаление строки
            const tdAction = document.createElement('td');
            tdAction.style.cssText = 'border:1px solid #dee2e6; text-align:center;';
            tdAction.innerHTML = `<button style="background:none; border:none; color:#dc3545; cursor:pointer;">✕</button>`;
            tdAction.querySelector('button').addEventListener('click', () => {
                this.entity.rows.splice(rowIndex, 1);
                this.saveAndRefresh();
            });
            tr.appendChild(tdAction);

            tableBody.appendChild(tr);
        });

        // Обработчики кнопок меню
        wrapper.querySelector('#add-column-btn').addEventListener('click', () => {
            const name = prompt('Имя новой колонки:');
            if (name && !this.entity.columns.includes(name)) {
                this.entity.columns.push(name);
                this.entity.columnTypes[name] = 'TEXT';
                this.saveAndRefresh(); // Теперь контекст "this" не теряется!
            }
        });

        wrapper.querySelector('#add-row-btn').addEventListener('click', () => {
            const row = {};
            this.entity.columns.forEach(c => {
                row[c] = this.entity.columnTypes[c] === 'BOOLEAN' ? false : '';
            });
            this.entity.rows.push(row);
            this.saveAndRefresh(); // Контекст "this" сохранен!
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