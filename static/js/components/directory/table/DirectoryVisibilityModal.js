// static/js/components/directory/table/DirectoryVisibilityModal.js

export class DirectoryVisibilityModal {
  constructor(canvasContext) {
    this.ctx = canvasContext;
  }

  open() {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; z-index:9999;';

    // МЕТАМОДЕЛЬ: Гарантируем, что в объекте справочника есть массив скрытых колонок
    if (!Array.isArray(this.ctx.entity.hiddenColumns)) {
      this.ctx.entity.hiddenColumns = [];
    }

    let checkboxesHTML = '';
    this.ctx.entity.columns.forEach(col => {
      const isNameCol = col === 'Наименование';
      // ИСПРАВЛЕНО: Проверяем присутствие колонки в массиве скрытых колонок справочника
      const isHidden = this.ctx.entity.hiddenColumns.includes(col);
      const isChecked = !isHidden ? 'checked' : '';
      const disabledAttr = isNameCol ? 'disabled' : '';

      checkboxesHTML += `
        <label style="display:flex; align-items:center; gap:10px; margin-bottom:12px; font-size:0.95rem; cursor:${isNameCol ? 'not-allowed' : 'pointer'}; user-select:none;">
          <input type="checkbox" class="col-vis-checkbox" value="${col}" ${isChecked} ${disabledAttr}>
          <span style="color:${isNameCol ? '#94a3b8' : '#1e293b'}">${col}</span>
        </label>
      `;
    });

    modal.innerHTML = `
      <div style="background:white; padding:20px; border-radius:6px; width:280px; box-shadow:0 4px 15px rgba(0,0,0,0.15); box-sizing:border-box;">
        <h4 style="margin-top:0; border-bottom:1px solid #cbd5e1; padding-bottom:8px; color:#1e293b; font-size:1rem;">👁️ Отображение колонок</h4>
        <div style="margin-top:15px; margin-bottom:20px; max-height:200px; overflow-y:auto;">${checkboxesHTML}</div>
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button id="vis-cancel" style="padding:5px 12px; background:#64748b; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.8rem;">Отмена</button>
          <button id="vis-save" style="padding:5px 12px; background:#10b981; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.8rem;">Применить</button>
        </div>
      </div>
    `;

    modal.querySelector('#vis-cancel').addEventListener('click', () => modal.remove());
    
    modal.querySelector('#vis-save').addEventListener('click', () => {
      // ИСПРАВЛЕНО: Сбрасываем и наполняем массив скрытых колонок в сущности базы данных
      this.ctx.entity.hiddenColumns = [];
      
      modal.querySelectorAll('.col-vis-checkbox').forEach(cb => {
        if (!cb.checked) {
          this.ctx.entity.hiddenColumns.push(cb.value);
        }
      });

      // saveAndRefresh автоматически запишет измененный массив в IndexedDB и отправит на Go-сервер
      this.ctx.saveAndRefresh(); 
      modal.remove();
    });

    document.body.appendChild(modal);
  }
}
