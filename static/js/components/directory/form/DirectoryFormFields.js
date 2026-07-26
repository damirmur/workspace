// static/js/components/directory/form/DirectoryFormFields.js
import { FieldTypes } from '../../../fields/FieldRegistry.js';

export class DirectoryFormFields {
  constructor(formContext) {
    this.form = formContext;
  }

  render(containerElement) {
    // Проверяем, проведен ли документ прямо сейчас
    const isReadOnly = this.form.formData._status === 2;

    const fieldsBlock = document.createElement('div');
    fieldsBlock.style.cssText = 'display:flex; flex-direction:column; gap:15px; max-width:600px;';
    
    fieldsBlock.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:6px; background:#f1f5f9; padding:10px; border-radius:6px; border:1px solid #e2e8f0;">
        <label style="font-weight:bold; font-size:0.8rem; color:#475569;">Родительская группа / Папка:</label>
        <select id="form-parent-node-select" style="padding:6px; font-size:0.9rem; border-radius:4px; border:1px solid #cbd5e1; cursor:pointer;" ${isReadOnly ? 'disabled' : ''}></select>
      </div>
      <div id="fields-inputs-injector" style="display:flex; flex-direction:column; gap:15px;"></div>
    `;

    const parentSelect = fieldsBlock.querySelector('#form-parent-node-select');
    const rootOpt = document.createElement('option');
    rootOpt.value = 'ROOT'; rootOpt.textContent = '[-- Корень справочника --]';
    if (this.form.formData.parentId === null) rootOpt.selected = true;
    parentSelect.appendChild(rootOpt);

    const firstColName = this.form.ctx.entity.columns[0];
    this.form.ctx.entity.rows.forEach(r => {
      if (r.id === this.form.formData.id) return;
      const opt = document.createElement('option');
      opt.value = r.id; opt.textContent = `📁 ${r[firstColName] || r.id.slice(0,6)}`;
      if (r.id === this.form.formData.parentId) opt.selected = true;
      parentSelect.appendChild(opt);
    });

    if (!isReadOnly) {
      parentSelect.addEventListener('change', () => { 
        this.form.formData.parentId = parentSelect.value === 'ROOT' ? null : parentSelect.value; 
      });
    }

    const inputsInjector = fieldsBlock.querySelector('#fields-inputs-injector');
    this.form.ctx.entity.columns.forEach(colName => {
      const type = this.form.ctx.entity.columnTypes[colName] || 'TEXT';
      const fieldBlock = document.createElement('div');
      fieldBlock.style.cssText = 'display:flex; flex-direction:column; gap:4px;';
      fieldBlock.innerHTML = `<label style="font-weight:600; font-size:0.85rem; color:#334155;">${colName}</label>`;
      
      let inputElement;
      if (type === 'TEXT' && colName.toLowerCase().includes('описание')) {
        const textarea = document.createElement('textarea');
        textarea.style.cssText = 'width:100%; height:100px; padding:8px; border:1px solid #cbd5e1; border-radius:4px; font-family:inherit; font-size:0.9rem;';
        textarea.value = this.form.formData[colName] || '';
        if (isReadOnly) {
          textarea.disabled = true;
          textarea.style.background = '#f8fafc';
        } else {
          textarea.addEventListener('input', () => { this.form.formData[colName] = textarea.value; });
        }
        inputElement = textarea;
      } else {
        inputElement = FieldTypes[type].renderEdit(
          this.form.formData[colName], 
          (nV) => { this.form.formData[colName] = nV; }, 
          colName, 
          this.form.ctx.entity, 
          this.form.tab.id, 
          this.form.formData.id
        );
        
        // Если запись ПРОВЕДЕНА, блокируем любые инпуты/селекторы внутри сгенерированной ячейки
        if (isReadOnly) {
          inputElement.querySelectorAll('input, select, textarea, button').forEach(el => el.disabled = true);
          if (inputElement.tagName === 'INPUT' || inputElement.tagName === 'SELECT') {
            inputElement.disabled = true;
          }
        }
      }

      fieldBlock.appendChild(inputElement);
      inputsInjector.appendChild(fieldBlock);
    });

    containerElement.appendChild(fieldsBlock);
  }
}
