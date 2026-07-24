import { BaseCanvasComponent } from './BaseCanvasComponent.js';
import { FieldTypes } from '../fields/FieldRegistry.js';

export class DirectoryCanvasComponent extends BaseCanvasComponent {
    constructor(entity, onUpdate, onDelete) {
        super(entity, onUpdate, onDelete);
        if (!this.entity.columns) this.entity.columns = ['Название', 'Описание'];
        if (!this.entity.columnTypes) {
            this.entity.columnTypes = {};
            this.entity.columns.forEach(col => { this.entity.columnTypes[col] = 'TEXT'; });
        }
        if (!this.entity.rows) this.entity.rows = [];

        // Храним текущее значение фильтра в памяти компонента
        this.currentSearchQuery = '';
    }

    render() {
        const wrapper = document.createElement('div');
        wrapper.className = 'directory-workspace';

        wrapper.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <h2 id="directory-title-text" style="margin:0; padding:4px; border-radius:4px;">🗂️ ${this.entity.title}</h2>
        <div style="display:flex; gap:10px;">
          <button id="add-column-btn" style="padding: 8px 12px; background:#6c757d; color:white; border:none; border-radius:4px; cursor:pointer;">+ Колонка</button>
          <button id="add-row-btn" style="padding: 8px 12px; background:#007bff; color:white; border:none; border-radius:4px; cursor:pointer;">+ Строка</button>
          <button id="dir-delete-btn" style="padding: 8px 12px; background:#dc3545; color:white; border:none; border-radius:4px; cursor:pointer;">Удалить</button>
        </div>
      </div>

      <!-- Фильтрация строк таблицы справочника -->
      <div style="margin-bottom: 15px;">
        <input type="text" id="table-search-input" placeholder="🔍 Интерактивный поиск по всем колонкам справочника..." style="width:100%; padding:8px; border:1px solid #cbd5e0; border-radius:4px; box-sizing:border-box;">
      </div>

      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; margin-top:5px; font-size:0.95rem;">
          <thead><tr id="table-head-row"></tr></thead>
          <tbody id="table-body"></tbody>
        </table>
      </div>
    `;

        const titleHeader = wrapper.querySelector('#directory-title-text');
        const headRow = wrapper.querySelector('#table-head-row');
        const tableBody = wrapper.querySelector('#table-body');
        const searchInput = wrapper.querySelector('#table-search-input');

        // Восстанавливаем значение поиска, если была перерисовка дерева
        if (searchInput) {
            searchInput.value = this.currentSearchQuery;
        }

        if (titleHeader) {
            this.makeEditable(titleHeader, (newTitle) => {
                this.entity.title = newTitle.replace(/^🗂️\s*/, '');
                this.onUpdate(this.entity);
            });
        }

        // Рендеринг шапки
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

            th.querySelector('.col-type-select').addEventListener('change', (e) => {
                const selectedType = e.target.value;
                this.entity.columnTypes[colName] = selectedType;
                this.entity.rows.forEach(row => {
                    if (selectedType === 'BOOLEAN') row[colName] = false;
                    else if (selectedType === 'TIMESTAMP') row[colName] = { utc: Date.now(), offset: '+00:00' };
                    else row[colName] = '';
                });
                this.saveAndRefresh();
            });

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

        const thAction = document.createElement('th');
        thAction.style.cssText = 'background:#f1f3f5; border:1px solid #dee2e6; width:40px;';
        headRow.appendChild(thAction);

        // Функция фильтрации строк на клиенте (In-Memory)
        const filterTableRows = () => {
            this.currentSearchQuery = searchInput.value.toLowerCase().trim();
            const rowsDOM = tableBody.querySelectorAll('tr');

            this.entity.rows.forEach((row, index) => {
                const trDOM = rowsDOM[index];
                if (!trDOM) return;

                if (!this.currentSearchQuery) {
                    trDOM.style.display = ''; // Показываем строку, если поиск пуст
                    return;
                }

                // Сканируем все ячейки текущей строки на совпадение с поисковым запросом
                let isMatch = false;
                for (const colName of this.entity.columns) {
                    const type = this.entity.columnTypes[colName] || 'TEXT';
                    const cellValue = row[colName];
                    let textToSearch = '';

                    // Извлекаем текстовое представление ячейки в зависимости от её типа данных
                    if (type === 'TIMESTAMP' && cellValue && cellValue.utc) {
                        textToSearch = new Date(cellValue.utc).toLocaleString() + (cellValue.zoneName || '');
                    } else if (type === 'JSON' && cellValue) {
                        textToSearch = JSON.stringify(cellValue);
                    } else if (type === 'ZIP_FILE' && cellValue) {
                        textToSearch = cellValue.fileName || '';
                    } else if (cellValue !== undefined && cellValue !== null) {
                        textToSearch = String(cellValue);
                    }

                    if (textToSearch.toLowerCase().includes(this.currentSearchQuery)) {
                        isMatch = true;
                        break; // Если совпадение найдено хотя бы в одной колонке, прерываем цикл поиска по строке
                    }
                }

                trDOM.style.display = isMatch ? '' : 'none'; // Скрываем или показываем tr в DOM
            });
        };

        // 3. Рендеринг строк таблицы
        this.entity.rows.forEach((row, rowIndex) => {
            const tr = document.createElement('tr');
            tr.style.transition = 'background 0.2s';

            this.entity.columns.forEach(colName => {
                const td = document.createElement('td');
                td.style.cssText = 'border:1px solid #dee2e6; padding:10px; min-width:120px; cursor:pointer;';

                const type = this.entity.columnTypes[colName] || 'TEXT';
                const fieldProcessor = FieldTypes[type];

                td.textContent = fieldProcessor.renderView(row[colName]);

                td.addEventListener('click', (e) => {
                    if (td.querySelector('input') || td.querySelector('select') || td.querySelector('textarea')) return;

                    td.innerHTML = '';
                    const editComponent = fieldProcessor.renderEdit(row[colName], (newValue) => {
                        row[colName] = newValue;
                        this.onUpdate(this.entity);
                        td.innerHTML = '';
                        td.textContent = fieldProcessor.renderView(newValue);
                        // Если ячейку отредактировали, проверяем, подходит ли она под текущий фильтр
                        filterTableRows();
                    });

                    td.appendChild(editComponent);
                    const innerInput = editComponent.querySelector('input[type="text"], input[type="number"], textarea');
                    if (innerInput) innerInput.focus();
                });

                tr.appendChild(td);
            });

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

        // Навешиваем событие на инпут поиска СРАЗУ после отрисовки строк
        if (searchInput) {
            searchInput.addEventListener('input', filterTableRows);
            // Если поиск уже был активен до перерисовки (например, добавили новую строку), применяем фильтр
            if (this.currentSearchQuery) filterTableRows();
        }

        // Кнопки верхнего меню
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
            this.entity.columns.forEach(c => { row[c] = this.entity.columnTypes[c] === 'BOOLEAN' ? false : ''; });
            this.entity.rows.push(row); this.saveAndRefresh();
        });
        wrapper.querySelector('#dir-delete-btn').addEventListener('click', () => {
            if (confirm(`Удалить весь справочник "${this.entity.title}"?`)) { this.onDelete(this.entity.id); }
        }); return wrapper;
    }
}