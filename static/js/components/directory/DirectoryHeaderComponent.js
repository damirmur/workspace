// static/js/components/directory/DirectoryHeaderComponent.js

export class DirectoryHeaderComponent {
  constructor(componentContext) {
    this.ctx = componentContext;
  }

  render(headRowElement) {
    headRowElement.innerHTML = '';

    this.ctx.entity.columns.forEach((colName, colIndex) => {
      const currentType = this.ctx.entity.columnTypes[colName] || 'TEXT';
      const th = document.createElement('th');
      th.style.cssText = 'background:#f1f3f5; border:1px solid #dee2e6; padding:10px; text-align:left; position:relative; min-width:140px;';

      const isNameColumn = colName === 'Наименование' || colIndex === 0;

      th.innerHTML = `
  <div style="display:flex; flex-direction:column; gap:4px; margin-right:15px;">
    <span class="col-title" style="font-weight:bold;">${colName}</span>
    <select class="col-type-select" style="font-size:0.75rem; padding:2px; cursor:pointer;">
      <option value="TEXT" ${currentType === 'TEXT' ? 'selected' : ''}>Текст</option>
      <option value="NUMBER" ${currentType === 'NUMBER' ? 'selected' : ''}>Число</option>
      <option value="BOOLEAN" ${currentType === 'BOOLEAN' ? 'selected' : ''}>Чекбокс</option>
      <option value="TIMESTAMP" ${currentType === 'TIMESTAMP' ? 'selected' : ''}>Время (UTC)</option>
      <option value="JSON" ${currentType === 'JSON' ? 'selected' : ''}>JSON</option>
      <option value="ZIP_FILE" ${currentType === 'ZIP_FILE' ? 'selected' : ''}>📦 ZIP Архив (Файлы)</option>
      <option value="RELATION" ${currentType === 'RELATION' ? 'selected' : ''}>🔗 Связь (Relation)</option>
    </select>
  </div>
  ${!isNameColumn ? '<button class="del-col-btn" style="position:absolute; right:4px; top:4px; background:none; border:none; color:#dc3545; cursor:pointer; font-size:0.75rem;">✕</button>' : ''}
`;

      // Изменение типа данных колонки
      th.querySelector('.col-type-select').addEventListener('change', (e) => {
        const selectedType = e.target.value;

        // РЕЖИМ СВЯЗИ: Если выбрали RELATION, запрашиваем целевой справочник
        if (selectedType === 'RELATION') {
          // Берем список всех справочников, кроме текущего
          const availableDirs = this.ctx.app.entities.filter(ent => ent.type === 'directory' && ent.id !== this.ctx.entity.id);

          if (availableDirs.length === 0) {
            alert("Ошибка: Сначала создайте хотя бы один другой справочник, чтобы связаться с ним!");
            e.target.value = currentType; // Сбрасываем выбор назад
            return;
          }

          const dirListText = availableDirs.map((d, idx) => `${idx + 1}. ${d.title}`).join('\n');
          const choice = prompt(`Введите НОМЕР справочника, с которым хотите связать колонку "${colName}":\n\n${dirListText}`);
          const chosenIdx = parseInt(choice, 10) - 1;

          if (isNaN(chosenIdx) || chosenIdx < 0 || chosenIdx >= availableDirs.length) {
            alert("Выбор отменен или указан некорректный номер.");
            e.target.value = currentType;
            return;
          }

          const selectedDir = availableDirs[chosenIdx];

          // Легально фиксируем связь в метаданных сущности
          if (!this.ctx.entity.relationTargets) this.ctx.entity.relationTargets = {};
          this.ctx.entity.relationTargets[colName] = selectedDir.id;
        } else {
          // Если переключили с RELATION на обычный тип, удаляем метаданные связи
          if (this.ctx.entity.relationTargets) {
            delete this.ctx.entity.relationTargets[colName];
          }
        }

        this.ctx.entity.columnTypes[colName] = selectedType;

        // Инициализируем дефолтные значения строк под выбранную структуру
        this.ctx.entity.rows.forEach(row => {
          if (selectedType === 'BOOLEAN') row[colName] = false;
          else if (selectedType === 'TIMESTAMP') row[colName] = { utc: Date.now(), offset: '+00:00', zoneName: 'UTC' };
          else row[colName] = '';
        });

        this.ctx.saveAndRefresh();
      });

      // Переименование колонки
      this.ctx.makeEditable(th.querySelector('.col-title'), (newName) => {
        if (!newName || this.ctx.entity.columns.includes(newName)) return;

        // Переносим тип данных
        this.ctx.entity.columnTypes[newName] = currentType;
        delete this.ctx.entity.columnTypes[colName];

        // Переносим метаданные связи, если они были
        if (this.ctx.entity.relationTargets && this.ctx.entity.relationTargets[colName]) {
          this.ctx.entity.relationTargets[newName] = this.ctx.entity.relationTargets[colName];
          delete this.ctx.entity.relationTargets[colName];
        }

        this.ctx.entity.columns[colIndex] = newName;
        this.ctx.entity.rows.forEach(row => {
          row[newName] = row[colName];
          delete row[colName];
        });
        this.ctx.saveAndRefresh();
      });

      const delColBtn = th.querySelector('.del-col-btn');

      // ИСПРАВЛЕНИЕ: Вешаем слушатель только если кнопка была отрендерена (для колонки Наименование её нет)
      if (delColBtn) {
        delColBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`Удалить колонку "${colName}" и все данные внутри неё?`)) {
            this.ctx.entity.columns.splice(colIndex, 1);
            delete this.ctx.entity.columnTypes[colName];
            if (this.ctx.entity.relationTargets) delete this.ctx.entity.relationTargets[colName];
            this.ctx.entity.rows.forEach(row => delete row[colName]);
            this.ctx.saveAndRefresh();
          }
        });
      }

      headRowElement.appendChild(th);
    });

    const thAction = document.createElement('th');
    thAction.style.cssText = 'background:#f1f3f5; border:1px solid #dee2e6; width:40px;';
    headRowElement.appendChild(thAction);
  }
}
