// static/js/components/directory/table/DirectoryRelationsModal.js

export class DirectoryRelationsModal {
  constructor(canvasContext) {
    this.ctx = canvasContext;
  }

  open() {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; z-index:9999;';
    
    const otherDirectories = this.ctx.app.entities.filter(e => e.type === 'directory' && e.id !== this.ctx.entity.id);
    
    let checkboxesHTML = '';
    if (otherDirectories.length === 0) {
      checkboxesHTML = '<p style="color:#64748b; font-style:italic;">Нет других справочников в системе для построения связей.</p>';
    } else {
      otherDirectories.forEach(dir => {
        const isChecked = this.ctx.entity.allowedSubDirectories.includes(dir.id) ? 'checked' : '';
        checkboxesHTML += `
          <label style="display:flex; align-items:center; gap:10px; margin-bottom:10px; font-size:0.95rem; cursor:pointer; user-select:none;">
            <input type="checkbox" class="rel-dir-checkbox" value="${dir.id}" ${isChecked}>
            <span>🗂️ ${dir.title}</span>
          </label>
        `;
      });
    }

    modal.innerHTML = `
      <div style="background:white; padding:25px; border-radius:8px; width:350px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);">
        <h3 style="margin-top:0; border-bottom:1px solid #cbd5e1; padding-bottom:10px; color:#1e293b;">⚙️ Подчиненные справочники</h3>
        <p style="font-size:0.8rem; color:#64748b; margin-bottom:15px;">Отметьте таблицы, которые будут выводиться в виде закладок внутри карточки этого справочника.</p>
        <div style="max-height:200px; overflow-y:auto; margin-bottom:20px;">${checkboxesHTML}</div>
        <div style="display:flex; justify-content:flex-end; gap:10px;">
          <button id="modal-cancel" style="padding:6px 12px; background:#64748b; color:white; border:none; border-radius:4px; cursor:pointer;">Отмена</button>
          <button id="modal-save" style="padding:6px 12px; background:#10b981; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">Сохранить</button>
        </div>
      </div>
    `;

    modal.querySelector('#modal-cancel').addEventListener('click', () => modal.remove());
    
    modal.querySelector('#modal-save').addEventListener('click', () => {
      const selectedIds = Array.from(modal.querySelectorAll('.rel-dir-checkbox:checked')).map(cb => Number(cb.value));
      this.ctx.entity.allowedSubDirectories = selectedIds;
      this.ctx.onUpdate(this.ctx.entity); 
      modal.remove();
    });

    document.body.appendChild(modal);
  }
}
