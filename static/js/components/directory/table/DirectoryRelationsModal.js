// static/js/components/directory/table/DirectoryRelationsModal.js

export class DirectoryRelationsModal {
  constructor(canvasContext) {
    this.ctx = canvasContext;
  }

  open() {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; z-index:9999;';
    
    // Получаем все справочники системы, кроме текущего
    const otherDirectories = this.ctx.app.entities.filter(e => e.type === 'directory' && e.id !== this.ctx.entity.id);
    
    // Гарантируем, что allowedSubDirectories инициализирован как массив объектов
    if (!Array.isArray(this.ctx.entity.allowedSubDirectories)) {
      this.ctx.entity.allowedSubDirectories = [];
    }

    let relationsHTML = '';
    if (otherDirectories.length === 0) {
      relationsHTML = '<p style="color:#64748b; font-style:italic; text-align:center;">Нет других справочников в системе для построения связей.</p>';
    } else {
      otherDirectories.forEach(dir => {
        // Ищем, настроена ли уже связь с этим справочником в метаданных
        const currentRel = this.ctx.entity.allowedSubDirectories.find(r => r.childDirectoryId === dir.id);
        const relType = currentRel ? currentRel.relationType : 'NONE';

        relationsHTML += `
          <div style="display:flex; align-items:center; justify-content:space-between; background:#f8fafc; padding:10px; border-radius:6px; border:1px solid #e2e8f0; margin-bottom:8px; box-sizing:border-box;">
            <span style="font-size:0.95rem; font-weight:600; color:#334155;">🗂️ ${dir.title}</span>
            <select class="rel-type-selector" data-dir-id="${dir.id}" style="padding:4px 8px; font-size:0.85rem; border-radius:4px; border:1px solid #cbd5e1; cursor:pointer; background:white;">
              <option value="NONE" ${relType === 'NONE' ? 'selected' : ''}>❌ Отключено</option>
              <option value="ONE_TO_MANY" ${relType === 'ONE_TO_MANY' ? 'selected' : ''}>🔒 Подчиненный (1:N)</option>
              <option value="MANY_TO_MANY" ${relType === 'MANY_TO_MANY' ? 'selected' : ''}>🔗 Общий пул (N:M)</option>
            </select>
          </div>
        `;
      });
    }

    modal.innerHTML = `
      <div style="background:white; padding:25px; border-radius:8px; width:450px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); display:flex; flex-direction:column; max-height:80vh;">
        <h3 style="margin-top:0; border-bottom:1px solid #cbd5e1; padding-bottom:10px; color:#1e293b;">⚙️ Настройка связей подтаблиц</h3>
        <p style="font-size:0.8rem; color:#64748b; margin-bottom:15px; line-height:1.4;">
          Спроектируйте правила вложенности. Выберите тип связи для справочников, которые будут отображаться в виде внутренних закладок карточки элемента.
        </p>
        <div style="overflow-y:auto; flex-grow:1; margin-bottom:20px; padding-right:5px;">${relationsHTML}</div>
        <div style="display:flex; justify-content:flex-end; gap:10px; flex-shrink:0;">
          <button id="modal-cancel" style="padding:8px 14px; background:#64748b; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.85rem;">Отмена</button>
          <button id="modal-save" style="padding:8px 14px; background:#10b981; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.85rem;">Сохранить схему</button>
        </div>
      </div>
    `;

    modal.querySelector('#modal-cancel').addEventListener('click', () => modal.remove());
    
    modal.querySelector('#modal-save').addEventListener('click', () => {
      const newAllowedSubDirs = [];
      
      modal.querySelectorAll('.rel-type-selector').forEach(select => {
        const type = select.value;
        if (type !== 'NONE') {
          newAllowedSubDirs.push({
            childDirectoryId: Number(select.dataset.dirId),
            relationType: type
          });
        }
      });

      this.ctx.entity.allowedSubDirectories = newAllowedSubDirs;
      this.ctx.onUpdate(this.ctx.entity); // Фиксируем спроектированную метамодель в IndexedDB
      modal.remove();
    });

    document.body.appendChild(modal);
  }
}
