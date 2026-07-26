// static/js/components/directory/table/DirectoryLinkModal.js

export class DirectoryLinkModal {
  constructor(canvasContext) {
    this.ctx = canvasContext;
  }

  open() {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; z-index:9999;';

    const { directoryId, rowId, relationType } = this.ctx.tab.ownerContext;

    const unlinkedRows = (this.ctx.entity.rows || []).filter(row => {
      if (relationType === 'MANY_TO_MANY') {
        if (Array.isArray(row._ownerContext)) {
          return !row._ownerContext.some(ctx => String(ctx.directoryId) === String(directoryId) && String(ctx.rowId) === String(rowId));
        }
        return true;
      } else {
        return !row._ownerContext;
      }
    });

    let rowsHTML = '';
    if (unlinkedRows.length === 0) {
      rowsHTML = `<p style="color:#64748b; font-style:italic; text-align:center; padding:10px;">Все доступные записи уже привязаны.</p>`;
    } else {
      unlinkedRows.forEach(row => {
        const displayName = row['Наименование'] || `[Без имени: ${row.id.slice(0,6)}]`;
        rowsHTML += `
          <label style="display:flex; align-items:center; gap:10px; margin-bottom:10px; font-size:0.95rem; cursor:pointer; user-select:none; background:#f8fafc; padding:8px; border-radius:4px; border:1px solid #e2e8f0; width:100%; box-sizing:border-box;">
            <input type="checkbox" class="link-row-checkbox" value="${row.id}">
            <span>📄 ${displayName}</span>
          </label>
        `;
      });
    }

    modal.innerHTML = `
      <div style="background:white; padding:25px; border-radius:8px; width:400px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); display:flex; flex-direction:column; max-height:80vh; box-sizing:border-box;">
        <h3 style="margin-top:0; border-bottom:1px solid #cbd5e1; padding-bottom:10px; color:#1e293b; font-size:1.1rem;">🔗 Привязать элементы из базы</h3>
        <p style="font-size:0.8rem; color:#64748b; margin-bottom:15px; line-height:1.4;">Выберите свободные записи справочника "${this.ctx.entity.title}" по их Наименованию.</p>
        <div style="overflow-y:auto; flex-grow:1; margin-bottom:20px; padding-right:5px;">${rowsHTML}</div>
        <div style="display:flex; justify-content:flex-end; gap:10px; flex-shrink:0;">
          <button id="link-modal-cancel" style="padding:6px 12px; background:#64748b; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.85rem;">Отмена</button>
          ${unlinkedRows.length > 0 ? '<button id="link-modal-save" style="padding:6px 12px; background:#0ea5e9; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.85rem;">Привязать</button>' : ''}
        </div>
      </div>
    `;

    modal.querySelector('#link-modal-cancel').addEventListener('click', () => modal.remove());
    
    if (unlinkedRows.length > 0) {
      modal.querySelector('#link-modal-save').addEventListener('click', () => {
        const selectedRowIds = Array.from(modal.querySelectorAll('.link-row-checkbox:checked')).map(cb => cb.value);
        
        this.ctx.entity.rows.forEach(row => {
          if (selectedRowIds.includes(row.id)) {
            if (relationType === 'MANY_TO_MANY') {
              if (!Array.isArray(row._ownerContext)) {
                row._ownerContext = row._ownerContext ? [row._ownerContext] : [];
              }
              row._ownerContext.push({ directoryId, rowId });
            } else {
              row._ownerContext = { directoryId, rowId };
            }
          }
        });

        this.ctx.saveAndRefresh();
        modal.remove();
      });
    }

    document.body.appendChild(modal);
  }
}
