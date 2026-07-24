// static/js/components/directory/DirectoryHeaderComponent.js

export class DirectoryHeaderComponent {
  constructor(componentContext) {
    this.ctx = componentContext; // Ссылка на главный DirectoryCanvasComponent
  }

  render(headRowElement) {
    headRowElement.innerHTML = '';

    this.ctx.entity.columns.forEach((colName, colIndex) => {
      const currentType = this.ctx.entity.columnTypes[colName] || 'TEXT';
      const th = document.createElement('th');
      th.style.cssText = 'background:#f1f3f5; border:1px solid #dee2e6; padding:10px; text-align:left; position:relative; min-width:140px;';
      
      th.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:4px; margin-right:15px;">
          <span class="col-title" style="font-weight:bold;">${colName}</span>
          <select class="col-type-select" style="font-size:0.75rem; padding:2px; cursor:pointer;">
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

      // Изменение типа данных колонки
      th.querySelector('.col-type-select').addEventListener('change', (e) => {
        const selectedType = e.target.value;
        this.ctx.entity.columnTypes[colName] = selectedType;
        
        // Сброс значений строк для предотвращения конфликтов
        this.ctx.entity.rows.forEach(row => { 
          if (selectedType === 'BOOLEAN') row[colName] = false;
          else if (selectedType === 'TIMESTAMP') row[colName] = { utc: Date.now(), offset: '+00:00', zoneName: 'UTC' };
          else row[colName] = ''; 
        });
        this.ctx.saveAndRefresh();
      });

      // Инлайновое переименование колонки
      this.ctx.makeEditable(th.querySelector('.col-title'), (newName) => {
        if (!newName || this.ctx.entity.columns.includes(newName)) return;
        this.ctx.entity.columns[colIndex] = newName;
        this.ctx.entity.columnTypes[newName] = currentType;
        delete this.ctx.entity.columnTypes[colName];
        this.ctx.entity.rows.forEach(row => {
          row[newName] = row[colName];
          delete row[colName];
        });
        this.ctx.saveAndRefresh();
      });

      // Удаление колонки
      th.querySelector('.del-col-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Удалить колонку "${colName}" и все данные внутри неё?`)) {
          this.ctx.entity.columns.splice(colIndex, 1);
          delete this.ctx.entity.columnTypes[colName];
          this.ctx.entity.rows.forEach(row => delete row[colName]);
          this.ctx.saveAndRefresh();
        }
      });

      headRowElement.appendChild(th);
    });

    // Обязательная техническая колонка для кнопки удаления строки
    const thAction = document.createElement('th');
    thAction.style.cssText = 'background:#f1f3f5; border:1px solid #dee2e6; width:40px;';
    headRowElement.appendChild(thAction);
  }
}
