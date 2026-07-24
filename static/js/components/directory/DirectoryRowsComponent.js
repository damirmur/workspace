// static/js/components/directory/DirectoryRowsComponent.js
import { FieldTypes } from '../../fields/FieldRegistry.js';

export class DirectoryRowsComponent {
  constructor(componentContext) {
    this.ctx = componentContext;
  }

  render(tableBodyElement, filteredRows) {
    tableBodyElement.innerHTML = '';

    if (filteredRows.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        
          Ничего не найдено или таблица пуста
        </td>
      `;
      tableBodyElement.appendChild(tr);
      return;
    }

    filteredRows.forEach((row) => {
      // Ищем исходный индекс строки в общем массиве, чтобы правильно удалять или менять данные
      const originalIndex = this.ctx.entity.rows.indexOf(row);
      const tr = document.createElement('tr');

      this.ctx.entity.columns.forEach(colName => {
        const td = document.createElement('td');
        td.style.cssText = 'border:1px solid #dee2e6; padding:10px; cursor:pointer; min-width:120px; vertical-align:middle;';
        
        const type = this.ctx.entity.columnTypes[colName] || 'TEXT';
        const fieldProcessor = FieldTypes[type];

        // Режим просмотра (View)
        td.textContent = fieldProcessor.renderView(row[colName]);

        // Режим редактирования (Edit) при клике
        td.addEventListener('click', (e) => {
          if (td.querySelector('input') || td.querySelector('select') || td.querySelector('textarea')) return;

          td.innerHTML = '';
          const editComponent = fieldProcessor.renderEdit(row[colName], (newValue) => {
            row[colName] = newValue;
            this.ctx.onUpdate(this.ctx.entity); // Мягкий бэкап через Debounce
            td.innerHTML = '';
            td.textContent = fieldProcessor.renderView(newValue);
          });

          td.appendChild(editComponent);
          
          const innerInput = editComponent.querySelector('input[type="text"], input[type="number"], textarea');
          if (innerInput) innerInput.focus();
        });

        tr.appendChild(td);
      });

      // Кнопка удаления конкретной строки
      const tdAction = document.createElement('td');
      tdAction.style.cssText = 'border:1px solid #dee2e6; text-align:center; vertical-align:middle;';
      tdAction.innerHTML = `<button style="background:none; border:none; color:#dc3545; cursor:pointer; font-size:1.1rem; padding:4px;">✕</button>`;
      
      tdAction.querySelector('button').addEventListener('click', (e) => {
        e.stopPropagation();
        this.ctx.entity.rows.splice(originalIndex, 1);
        this.ctx.saveAndRefresh();
      });

      tr.appendChild(tdAction);
      tableBodyElement.appendChild(tr);
    });
  }
}
