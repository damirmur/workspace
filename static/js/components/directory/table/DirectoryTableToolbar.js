// static/js/components/directory/table/DirectoryTableToolbar.js

export class DirectoryTableToolbar {
  constructor(canvasContext) {
    this.ctx = canvasContext;
  }

  render(containerElement) {
    const isSubTable = !!this.ctx.tab.ownerContext;

    containerElement.innerHTML = `
      <h2 id="directory-title-text" style="margin:0; padding:4px; font-size:${isSubTable ? '1.1rem' : '1.4rem'}; color:#1e293b;">
        🗂️ ${this.ctx.entity.title}
      </h2>
      <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
        <button id="view-type-toggle-btn" style="padding: 6px 12px; background:#f1f5f9; color:#0f172a; border:1px solid #cbd5e1; border-radius:4px; cursor:pointer; font-size:0.8rem; font-weight:600;">
          ${this.ctx.viewType === 'table' ? '🌲 Дерево' : '📋 Таблица'}
        </button>
        
        ${!isSubTable ? '<button id="add-column-btn" style="padding: 6px 12px; background:#64748b; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.8rem;">+ Колонка</button>' : ''}
        
        <button id="add-row-form-btn" style="padding: 6px 12px; background:#10b981; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.8rem;">+ Создать новый</button>
        
        <!-- КНОПКА СВЯЗЫВАНИЯ СУЩЕСТВУЮЩИХ: Выводится только внутри подтаблиц карточки! -->
        ${isSubTable ? '<button id="link-existing-btn" style="padding: 6px 12px; background:#0ea5e9; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.8rem;">🔗 Привязать из базы</button>' : ''}

        ${!isSubTable ? `
          <button id="relations-config-btn" style="padding: 6px 12px; background:#e2e8f0; color:#1e293b; border:1px solid #cbd5e1; border-radius:4px; cursor:pointer; font-size:0.8rem;">⚙️ Связи</button>
          <button id="json-export-btn" style="padding: 6px 12px; background:#4f46e5; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.8rem;">📥 Экспорт</button>
          <button id="json-import-btn" style="padding: 6px 12px; background:#0ea5e9; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.8rem;">📤 Импорт</button>
          <input type="file" id="json-file-picker" accept=".json" style="display:none;">
          <button id="dir-delete-btn" style="padding: 6px 12px; background:#ef4444; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.8rem;">Удалить</button>
        ` : ''}
      </div>
    `;

    // Привязка стандартных обработчиков событий
    containerElement.querySelector('#view-type-toggle-btn').addEventListener('click', () => {
      this.ctx.viewType = this.ctx.viewType === 'table' ? 'tree' : 'table';
      this.ctx.tab.viewType = this.ctx.viewType;
      this.ctx.saveAndRefresh();
    });

    containerElement.querySelector('#add-row-form-btn').addEventListener('click', () => {
      this.ctx.app.tabsManager.openTab({
        id: crypto.randomUUID(),
        entityId: this.ctx.entity.id,
        title: '➕ Новый элемент',
        type: 'directory',
        viewMode: 'form',
        targetRowId: null,
        ownerContext: this.ctx.tab.ownerContext || null 
      });
    });

    // Логика кнопки "Привязать из базы" (Контекстный режим)
    if (isSubTable) {
      containerElement.querySelector('#link-existing-btn').addEventListener('click', () => this.openLinkExistingModal());
    }

    const titleHeader = containerElement.querySelector('#directory-title-text');
    if (titleHeader) {
      this.ctx.makeEditable(titleHeader, (newTitle) => {
        this.ctx.entity.title = newTitle.replace(/^🗂️\s*/, '');
        this.ctx.onUpdate(this.ctx.entity);
      });
    }

    if (!isSubTable) {
      containerElement.querySelector('#relations-config-btn').addEventListener('click', () => this.ctx.relationsModal.open());
      containerElement.querySelector('#json-export-btn').addEventListener('click', () => this.ctx.exchangeService.exportToJSON());
      const filePicker = containerElement.querySelector('#json-file-picker');
      containerElement.querySelector('#json-import-btn').addEventListener('click', () => filePicker.click());
      filePicker.addEventListener('change', (e) => { if (e.target.files) { this.ctx.exchangeService.importFromJSON(e.target.files); filePicker.value = ""; } });
      containerElement.querySelector('#add-column-btn').addEventListener('click', () => { const name = prompt('Введите название новой колонки:'); if (name && !this.ctx.entity.columns.includes(name)) { this.ctx.entity.columns.push(name); this.ctx.entity.columnTypes[name] = 'TEXT'; this.ctx.saveAndRefresh(); } });
      containerElement.querySelector('#dir-delete-btn').addEventListener('click', () => { if (confirm('Вы уверены?')) this.ctx.onDelete(this.ctx.entity.id); });
    }
  }

  /**
   * ООП-модальное окно выбора свободных элементов из базы для привязки
   */
// static/js/components/directory/table/DirectoryTableToolbar.js

  openLinkExistingModal() {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; z-index:9999;';

    // Находим свободные строки дочернего справочника
    const unlinkedRows = (this.ctx.entity.rows || []).filter(row => !row._ownerContext);

    let rowsHTML = '';
    if (unlinkedRows.length === 0) {
      rowsHTML = `<p style="color:#64748b; font-style:italic; text-align:center; padding:10px;">В базе данных нет свободных записей для привязки.</p>`;
    } else {
      unlinkedRows.forEach(row => {
        // ИСПРАВЛЕНО: Гарантированно выводим человеческое Наименование строки
        const displayName = row['Наименование'] || `[Без имени: ${row.id.slice(0,6)}]`;
        
        rowsHTML += `
          <label style="display:flex; align-items:center; gap:10px; margin-bottom:10px; font-size:0.95rem; cursor:pointer; user-select:none; background:#f8fafc; padding:8px; border-radius:4px; border:1px solid #e2e8f0;">
            <input type="checkbox" class="link-row-checkbox" value="${row.id}">
            <span>📄 ${displayName}</span>
          </label>
        `;
      });
    }

    modal.innerHTML = `
      <div style="background:white; padding:25px; border-radius:8px; width:400px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); display:flex; flex-direction:column; max-height:80vh;">
        <h3 style="margin-top:0; border-bottom:1px solid #cbd5e1; padding-bottom:10px; color:#1e293b;">🔗 Привязать элементы</h3>
        <p style="font-size:0.8rem; color:#64748b; margin-bottom:15px;">Выберите существующие записи из справочника "${this.ctx.entity.title}" по их Наименованию.</p>
        <div style="overflow-y:auto; flex-grow:1; margin-bottom:20px; padding-right:5px;">${rowsHTML}</div>
        <div style="display:flex; justify-content:flex-end; gap:10px; flex-shrink:0;">
          <button id="link-modal-cancel" style="padding:6px 12px; background:#64748b; color:white; border:none; border-radius:4px; cursor:pointer;">Отмена</button>
          ${unlinkedRows.length > 0 ? '<button id="link-modal-save" style="padding:6px 12px; background:#0ea5e9; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">Привязать</button>' : ''}
        </div>
      </div>
    `;

    modal.querySelector('#link-modal-cancel').addEventListener('click', () => modal.remove());
    
    if (unlinkedRows.length > 0) {
      modal.querySelector('#link-modal-save').addEventListener('click', () => {
        const selectedRowIds = Array.from(modal.querySelectorAll('.link-row-checkbox:checked')).map(cb => cb.value);
        
        this.ctx.entity.rows.forEach(row => {
          if (selectedRowIds.includes(row.id)) {
            row._ownerContext = {
              directoryId: this.ctx.tab.ownerContext.directoryId,
              rowId: this.ctx.tab.ownerContext.rowId
            };
          }
        });

        this.ctx.saveAndRefresh();
        modal.remove();
      });
    }

    document.body.appendChild(modal);
  }

}
