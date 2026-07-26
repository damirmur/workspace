// static/js/components/directory/DirectoryRowsComponent.js
import { FieldTypes } from '../../fields/FieldRegistry.js';

export class DirectoryRowsComponent {
  constructor(componentContext) {
    this.ctx = componentContext;
  }

  render(tableBodyElement, filteredRows) {
    tableBodyElement.innerHTML = '';

    if (filteredRows.length === 0) {
      tableBodyElement.innerHTML = `<tr>Ничего не найдено или таблица пуста</td></tr>`;
      return;
    }

    if (this.ctx.viewType === 'table') {
      filteredRows.forEach(row => this.buildRowDOM(tableBodyElement, row, filteredRows, 0));
    } else {
      const visibleTreeRows = [];
      const buildTreeLinear = (parentId, depth) => {
        const currentLevelItems = filteredRows.filter(r => (r.parentId || null) === parentId);
        currentLevelItems.forEach(row => {
          visibleTreeRows.push({ row, depth });
          if (this.ctx.tab.expandedNodes.has(row.id)) {
            buildTreeLinear(row.id, depth + 1);
          }
        });
      };
      buildTreeLinear(null, 0);

      if (visibleTreeRows.length === 0 && filteredRows.length > 0) {
        filteredRows.forEach(row => this.buildRowDOM(tableBodyElement, row, filteredRows, 0));
        return;
      }

      visibleTreeRows.forEach(({ row, depth }) => {
        this.buildRowDOM(tableBodyElement, row, filteredRows, depth);
      });
    }
  }

  buildRowDOM(tableBodyElement, row, allRows, depth) {
    const originalIndex = this.ctx.entity.rows.indexOf(row);
    const tr = document.createElement('tr');
    
    // Инициализируем системный статус по умолчанию (1 - Сохранен), если его нет в базе
    if (row._status === undefined) row._status = 1;

    // СТИЛИЗАЦИЯ СТРОКИ НА ОСНОВЕ СТАТУСА СТЭЙТ-МАШИНЫ
    let statusStyle = 'border-bottom:1px solid #e2e8f0; transition:background 0.15s;';
    if (row._status === 2) {
      statusStyle += ' background: #f0fdf4; color: #166534; font-weight: 500;'; // Нежно-зеленый для Проведенных
    } else if (row._status === 0) {
      statusStyle += ' background: #f8fafc; color: #94a3b8; text-decoration: line-through; opacity: 0.7;'; // Серый + перечеркнутый для Помеченных на удаление
    }
    tr.style.cssText = statusStyle;
    tr.className = 'directory-table-row';

    tr.addEventListener('mouseenter', () => { 
      if (row._status === 1) tr.style.background = '#f1f5f9'; 
    });
    tr.addEventListener('mouseleave', () => { 
      if (row._status === 1) tr.style.background = 'transparent';
      else if (row._status === 2) tr.style.background = '#f0fdf4';
      else if (row._status === 0) tr.style.background = '#f8fafc';
    });

    // Двойной клик открывает карточку-форму для редактирования
    tr.addEventListener('dblclick', () => {
      const firstCol = this.ctx.entity.columns;
      const rowTitle = row[firstCol] || 'Элемент';
      this.ctx.app.tabsManager.openTab({
        id: crypto.randomUUID(),
        entityId: this.ctx.entity.id,
        title: `📝 ${String(rowTitle).slice(0, 12)}`,
        type: 'directory',
        viewMode: 'form',
        targetRowId: row.id
      });
    });

    // Рендеринг ячеек
    this.ctx.entity.columns.forEach((colName, colIndex) => {
      // Защита скрытия колонок
      if (Array.isArray(this.ctx.entity.hiddenColumns) && this.ctx.entity.hiddenColumns.includes(colName)) {
        return;
      }

      const td = document.createElement('td');
      td.style.cssText = 'border-right:1px solid #e2e8f0; padding:10px; max-width:250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; vertical-align:middle;';
      
      const type = this.ctx.entity.columnTypes[colName] || 'TEXT';
      const cellContentText = FieldTypes[type].renderView(row[colName], colName, this.ctx.entity);

      if (colIndex === 0 && this.ctx.viewType === 'tree') {
        td.style.paddingLeft = `${depth * 20 + 10}px`;
        const hasChildren = this.ctx.entity.rows.some(r => (r.parentId || null) === row.id);
        const isExpanded = this.ctx.tab.expandedNodes.has(row.id);

        const treeControlsContainer = document.createElement('div');
        treeControlsContainer.style.cssText = 'display:inline-flex; align-items:center; gap:6px;';

        if (hasChildren) {
          const arrowSpan = document.createElement('span');
          arrowSpan.textContent = isExpanded ? '▼' : '▶';
          arrowSpan.style.cssText = 'cursor:pointer; font-size:0.75rem; color:#64748b; width:12px; display:inline-block; user-select:none;';
          arrowSpan.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isExpanded) this.ctx.tab.expandedNodes.delete(row.id);
            else this.ctx.tab.expandedNodes.add(row.id);
            this.ctx.saveAndRefresh();
          });
          treeControlsContainer.appendChild(arrowSpan);
        } else {
          const spacer = document.createElement('span');
          spacer.style.cssText = 'width:12px; display:inline-block;';
          treeControlsContainer.appendChild(spacer);
        }

        const textLabel = document.createElement('span');
        // Добавляем маркер галочки для проведенных в дереве
        const statusPrefix = row._status === 2 ? '✔ ' : '';
        textLabel.textContent = `${statusPrefix}${hasChildren ? '📁' : '📄'} ${cellContentText}`;
        treeControlsContainer.appendChild(textLabel);

        const subRowAddBtn = document.createElement('button');
        subRowAddBtn.textContent = '↳';
        subRowAddBtn.style.cssText = 'border:none; background:none; color:#0ea5e9; cursor:pointer; font-weight:bold; font-size:0.9rem; padding:0 4px; display:none;';
        
        // Подэлементы можно создавать только если узел не удален
        if (row._status !== 0) {
          tr.addEventListener('mouseenter', () => subRowAddBtn.style.display = 'inline-block');
          tr.addEventListener('mouseleave', () => subRowAddBtn.style.display = 'none');
        }

        subRowAddBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.ctx.app.tabsManager.openTab({
            id: crypto.randomUUID(),
            entityId: this.ctx.entity.id,
            title: `${this.ctx.entity.title}: Новый`,
            type: 'directory',
            viewMode: 'form',
            targetRowId: null,
            forcedParentId: row.id
          });
        });

        treeControlsContainer.appendChild(subRowAddBtn);
        td.appendChild(treeControlsContainer);
      } else {
        // Добавляем префикс галочки для проведенных элементов в обычной таблице
        td.textContent = (colIndex === 0 && row._status === 2) ? `✔ ${cellContentText}` : cellContentText;
      }

      td.title = td.textContent;
      tr.appendChild(td);
    });

    // ТЕХНИЧЕСКАЯ ПОЛОСА УПРАВЛЕНИЯ СТАТУСАМИ СТРОКИ (Правая колонка)
    const tdAction = document.createElement('td');
    tdAction.style.cssText = 'text-align:center; vertical-align:middle; width:75px; white-space:nowrap; padding:0 4px;';
    
    const isSubTable = !!this.ctx.tab.ownerContext;

    if (isSubTable) {
      // Если это вложенная подтаблица Master-Detail, кнопка ✕ просто отвязывает запись
      tdAction.innerHTML = `<button class="row-unlink-btn" style="background:none; border:none; color:#94a3b8; cursor:pointer; font-size:0.9rem;" title="Отвязать">✕</button>`;
      tdAction.querySelector('.row-unlink-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Отвязать этот элемент от текущей карточки?')) {
          const { directoryId, rowId, relationType } = this.ctx.tab.ownerContext;
          if (relationType === 'MANY_TO_MANY' && Array.isArray(row._ownerContext)) {
            row._ownerContext = row._ownerContext.filter(ctx => !(String(ctx.directoryId) === String(directoryId) && String(ctx.rowId) === String(rowId)));
            if (row._ownerContext.length === 0) delete row._ownerContext;
          } else {
            delete row._ownerContext;
          }
          this.ctx.saveAndRefresh();
        }
      });
    } else {
      // ГЛАВНЫЙ РЕЕСТР: Кнопка Проведения (✔️) и Яркая кнопка мягкого удаления (❌)
      const isDeleted = row._status === 0;
      const isPosted = row._status === 2;

      tdAction.innerHTML = `
        <button class="row-post-btn" style="background:none; border:none; cursor:pointer; font-size:0.85rem; opacity:${isDeleted ? '0.2' : '1'}; filter:${isPosted ? 'none' : 'grayscale(100%)'}; padding:2px;" ${isDeleted ? 'disabled' : ''} title="${isPosted ? 'Снять с проведения' : 'Провести'}">✔️</button>
        <button class="row-status-del-btn" style="background:none; border:none; cursor:pointer; font-size:0.85rem; padding:2px;" title="${isDeleted ? 'Восстановить запись' : 'Пометить на удаление'}">${isDeleted ? '↩️' : '❌'}</button>
      `;

      // Переключатель Проведения (1 <-> 2)
      tdAction.querySelector('.row-post-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        row._status = row._status === 2 ? 1 : 2;
        this.ctx.saveAndRefresh();
      });

      // Переключатель Мягкого удаления (1/2 -> 0 или 0 -> 1)
      tdAction.querySelector('.row-status-del-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (row._status === 0) {
          row._status = 1; // Восстанавливаем в статус Сохранен
        } else {
          if (confirm(`Пометить элемент "${row[this.ctx.entity.columns[0]] || 'Запись'}" на удаление?`)) {
            row._status = 0; // Помечаем ярким крестиком
          }
        }
        this.ctx.saveAndRefresh();
      });
    }

    tr.appendChild(tdAction);
    tableBodyElement.appendChild(tr);
  }
}
