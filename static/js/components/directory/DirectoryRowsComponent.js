// static/js/components/directory/DirectoryRowsComponent.js
import { FieldTypes } from '../../fields/FieldRegistry.js';

export class DirectoryRowsComponent {
  constructor(componentContext) {
    this.ctx = componentContext; // Ссылка на управляющий DirectoryCanvasComponent
  }

  /**
   * Рендеринг строк с поддержкой фильтрации и открытия карточки по двойному клику
   * @param {HTMLElement} tableBodyElement - Контейнер <tbody>
   * @param {Array} filteredRows - Отфильтрованный массив строк из памяти
   */
  render(tableBodyElement, filteredRows) {
    tableBodyElement.innerHTML = '';

    // Если данных нет, выводим аккуратную пустую заглушку
    if (filteredRows.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        
          Ничего не найдено или таблица пуста
        </td>
      `;
      tableBodyElement.appendChild(tr);
      return;
    }

    // В полномасштабном виртуальном скролле здесь нарезается срез среза [slice].
    // Для нашего реестра мы берем отфильтрованный массив и строим строки:
    filteredRows.forEach((row) => {
      // Находим глобальный индекс этой строки в исходной базе данных (нужно для удаления)
      const originalIndex = this.ctx.entity.rows.indexOf(row);
      const tr = document.createElement('tr');

      tr.style.cssText = 'border-bottom:1px solid #e2e8f0; transition:background 0.15s;';
      tr.className = 'directory-table-row';

      // Эффект наведения мыши (Hover) на чистом JS
      tr.addEventListener('mouseenter', () => { tr.style.background = '#f1f5f9'; });
      tr.addEventListener('mouseleave', () => { tr.style.background = 'transparent'; });

      tr.addEventListener('dblclick', () => {
        const firstColName = this.ctx.entity.columns[0]; // Берем имя первой колонки (например, "Название")
        const rowTitle = row[firstColName] || 'Карточка элемента';

        this.ctx.tab.viewMode = 'form';
        this.ctx.tab.targetRowId = row.id; // Передаем UUID строки
        this.ctx.tab.title = `📝 ${String(rowTitle).slice(0, 15)}`; // Динамическое имя плашки вкладки

        // Перерисовываем экран
        this.ctx.app.tabsManager.renderTabBar();
        this.ctx.app.tabsManager.renderCanvasContent();
      });

      // Рендерим ячейки по колонкам
      this.ctx.entity.columns.forEach(colName => {
        const td = document.createElement('td');
        td.style.cssText = 'border-right:1px solid #e2e8f0; padding:10px; max-width:250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; vertical-align:middle;';

        const type = this.ctx.entity.columnTypes[colName] || 'TEXT';
        const fieldProcessor = FieldTypes[type];

        // ИСПРАВЛЕНИЕ СИГНАТУРЫ: Передаем значение, имя колонки и всю сущность справочника.
        // Обычные поля проигнорируют параметры, а тип RELATION выполнит автоматический Join в памяти!
        td.textContent = fieldProcessor.renderView(row[colName], colName, this.ctx.entity);
        td.title = td.textContent; // Подсказка при наведении на ячейку

        tr.appendChild(td);
      });

      // Правая техническая колонка: Кнопка удаления строки из реестра
      const tdAction = document.createElement('td');
      tdAction.style.cssText = 'text-align:center; vertical-align:middle; width:40px;';
      tdAction.innerHTML = `
        <button class="row-del-btn" style="background:none; border:none; color:#94a3b8; cursor:pointer; font-size:1rem; padding:4px 8px; border-radius:4px; transition:all 0.2s;">
          ✕
        </button>
      `;

      const delBtn = tdAction.querySelector('.row-del-btn');
      delBtn.addEventListener('mouseenter', () => { delBtn.style.color = '#ef4444'; delBtn.style.background = '#fee2e2'; });
      delBtn.addEventListener('mouseleave', () => { delBtn.style.color = '#94a3b8'; delBtn.style.background = 'transparent'; });

      delBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Чтобы клик по крестику удаления не триггерил dblclick строки!
        if (confirm(`Удалить выбранную строку из справочника?`)) {
          this.ctx.entity.rows.splice(originalIndex, 1);
          this.ctx.saveAndRefresh(); // Перерисовываем строки
        }
      });

      tr.appendChild(tdAction);
      tableBodyElement.appendChild(tr);
    });
  }
}
