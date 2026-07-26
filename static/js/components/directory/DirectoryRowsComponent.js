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

    // ВЕТВЛЕНИЕ АЛГОРИТМА: Режим обычной Таблицы или иерархического Дерева
    if (this.ctx.viewType === 'table') {
      // Обычный плоский рендеринг (передаем отступ уровень = 0)
      filteredRows.forEach(row => this.buildRowDOM(tableBodyElement, row, filteredRows, 0));
    } else {
      // РЕЖИМ ДЕРЕВА: Строим упорядоченный плосный список видимых строк на основе иерархии parentId
      const visibleTreeRows = [];

      // Рекурсивный генератор дерева в плоский массив visibleTreeRows
      const buildTreeLinear = (parentId, depth) => {
        // Находим элементы текущего уровня вложенности
        const currentLevelItems = filteredRows.filter(r => {
          // Если parentId исходно не задан в базе, считаем его корневым (null)
          const rParent = r.parentId || null;
          return rParent === parentId;
        });

        currentLevelItems.forEach(row => {
          // Запоминаем уровень вложенности прямо внутри временной структуры обхода
          visibleTreeRows.push({ row, depth });

          // Если этот узел/папка развернут пользователем, спускаемся рекурсивно вглубь
          if (this.ctx.tab.expandedNodes.has(row.id)) {
            buildTreeLinear(row.id, depth + 1);
          }
        });
      };

      // Запускаем сборку от корня (parentId = null, глубина depth = 0)
      buildTreeLinear(null, 0);

      if (visibleTreeRows.length === 0 && filteredRows.length > 0) {
        // Фоллбэк: если у всех элементов битые parentId, выводим их как корень, чтобы данные не исчезли
        filteredRows.forEach(row => this.buildRowDOM(tableBodyElement, row, filteredRows, 0));
        return;
      }

      // Рендерим собранную линейную структуру дерева с учетом глубины отступа
      visibleTreeRows.forEach(({ row, depth }) => {
        this.buildRowDOM(tableBodyElement, row, filteredRows, depth);
      });
    }
  }

  /**
   * Универсальный сборщик DOM-элемента строки <tr>
   */
  buildRowDOM(tableBodyElement, row, allRows, depth) {
    const originalIndex = this.ctx.entity.rows.indexOf(row);
    const tr = document.createElement('tr');
    tr.style.cssText = 'border-bottom:1px solid #e2e8f0; transition:background 0.15s;';
    tr.className = 'directory-table-row';

    tr.addEventListener('mouseenter', () => { tr.style.background = '#f1f5f9'; });
    tr.addEventListener('mouseleave', () => { tr.style.background = 'transparent'; });

    tr.addEventListener('dblclick', () => {
      const firstCol = this.ctx.entity.columns;
      const rowTitle = row[firstCol] || 'Элемент';

      // Просим менеджер вкладок развернуть НОВУЮ вкладку карточки, не ломая вкладку списка!
      this.ctx.app.tabsManager.openTab({
        id: crypto.randomUUID(), // Уникальный ID самой вкладки формы карточки
        entityId: this.ctx.entity.id,
        title: `📝 ${String(rowTitle).slice(0, 12)}`,
        type: 'directory',
        viewMode: 'form',        // Сигнал фабрике: строить форму, а не таблицу
        targetRowId: row.id      // UUID строки для наполнения полей инпутов
      });
    });

    // Рендеринг ячеек
    this.ctx.entity.columns.forEach((colName, colIndex) => {
      const td = document.createElement('td');
      td.style.cssText = 'border-right:1px solid #e2e8f0; padding:10px; max-width:250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; vertical-align:middle;';

      const type = this.ctx.entity.columnTypes[colName] || 'TEXT';
      const fieldProcessor = FieldTypes[type];
      const cellContentText = fieldProcessor.renderView(row[colName], colName, this.ctx.entity);

      // СЛОЖНЫЙ ДИЗАЙН ПЕРВОЙ КОЛОНКИ: Добавляем отступы и иконки раскрытия в режиме Дерева
      if (colIndex === 0 && this.ctx.viewType === 'tree') {
        td.style.paddingLeft = `${depth * 20 + 10}px`; // Динамический отступ в зависимости от глубины

        // Проверяем, есть ли у этой строки дочерние элементы вообще в базе данных
        const hasChildren = this.ctx.entity.rows.some(r => (r.parentId || null) === row.id);
        const isExpanded = this.ctx.tab.expandedNodes.has(row.id);

        const treeControlsContainer = document.createElement('div');
        treeControlsContainer.style.cssText = 'display:inline-flex; align-items:center; gap:6px;';

        // Иконка-стрелочка раскрытия папки
        if (hasChildren) {
          const arrowSpan = document.createElement('span');
          arrowSpan.textContent = isExpanded ? '▼' : '▶';
          arrowSpan.style.cssText = 'cursor:pointer; font-size:0.75rem; color:#64748b; width:12px; display:inline-block; user-select:none;';
          arrowSpan.addEventListener('click', (e) => {
            e.stopPropagation(); // Защита от открытия формы элемента
            if (isExpanded) this.ctx.tab.expandedNodes.delete(row.id);
            else this.ctx.tab.expandedNodes.add(row.id);
            this.ctx.saveAndRefresh(); // Перерисовываем дерево свернутым/развернутым
          });
          treeControlsContainer.appendChild(arrowSpan);
        } else {
          // ПустойSpacer для сохранения идеальной вертикальной сетки у элементов без детей
          const spacer = document.createElement('span');
          spacer.style.cssText = 'width:12px; display:inline-block;';
          treeControlsContainer.appendChild(spacer);
        }

        // Текстовое наполнение ячейки
        const textLabel = document.createElement('span');
        textLabel.textContent = `${hasChildren ? '📁' : '📄'} ${cellContentText}`;
        treeControlsContainer.appendChild(textLabel);

        // Кнопка быстрого добавления вложенного ПОДЭЛЕМЕНТА (↳)
        const subRowAddBtn = document.createElement('button');
        subRowAddBtn.textContent = '↳';
        subRowAddBtn.title = `Создать дочерний элемент внутри "${cellContentText}"`;
        subRowAddBtn.style.cssText = 'border:none; background:none; color:#0ea5e9; cursor:pointer; font-weight:bold; font-size:0.9rem; padding:0 4px; border-radius:3px; display:none;';

        tr.addEventListener('mouseenter', () => subRowAddBtn.style.display = 'inline-block');
        tr.addEventListener('mouseleave', () => subRowAddBtn.style.display = 'none');

        subRowAddBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          // Переключаем вкладку в режим формы создания, НО передаем parentId в callback/настройки
          this.ctx.tab.viewMode = 'form';
          this.ctx.tab.targetRowId = null; // это создание
          this.ctx.tab.forcedParentId = row.id; // Передаем скрытый якорь родителя!
          this.ctx.saveAndRefresh();
        });

        treeControlsContainer.appendChild(subRowAddBtn);
        td.appendChild(treeControlsContainer);
      } else {
        // Для обычных колонок или режима 'table' — просто пишем текст
        td.textContent = cellContentText;
      }

      td.title = td.textContent;
      tr.appendChild(td);
    });

    // Правая колонка действий (Крестик удаления строки)
    const tdAction = document.createElement('td');
    tdAction.style.cssText = 'text-align:center; vertical-align:middle; width:40px;';
    tdAction.innerHTML = `<button class="row-del-btn" style="background:none; border:none; color:#94a3b8; cursor:pointer; font-size:1rem; padding:4px 8px; border-radius:4px;">✕</button>`;

    const delBtn = tdAction.querySelector('.row-del-btn');

    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();

      const isSubTable = !!this.ctx.tab.ownerContext;

      if (isSubTable) {
        // ЕСЛИ ЭТО ПОДТАБЛИЦА: Кнопка "✕" просто ОТВЯЗЫВАЕТ элемент, возвращая его в общую базу
        if (confirm(`Отвязать этот элемент от текущей карточки? (Запись останется в общей базе данных справочника)`)) {
          delete row._ownerContext; // Стираем контекст владельца, делая элемент свободным
          this.ctx.saveAndRefresh(); // Мгновенно перерисовываем строки и счетчики табов!
        }
      } else {
        // ЕСЛИ ЭТО ГЛАВНАЯ ТАБЛИЦА: Стандартное каскадное физическое удаление строки из базы
        if (confirm(`Удалить этот элемент справочника? (В режиме Дерева дочерние элементы станут корневыми)`)) {
          this.ctx.entity.rows.forEach(r => {
            if (r.parentId === row.id) r.parentId = row.parentId || null;
          });
          this.ctx.entity.rows.splice(originalIndex, 1);
          this.ctx.tab.expandedNodes.delete(row.id);
          this.ctx.saveAndRefresh();
        }
      }
    });
    tr.appendChild(tdAction);
    tableBodyElement.appendChild(tr);
  }
}
