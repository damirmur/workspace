// static/js/components/directory/form/DirectoryFormComponent.js
import { DirectoryFormTabs } from './DirectoryFormTabs.js';
import { DirectoryFormFields } from './DirectoryFormFields.js';

export class DirectoryFormComponent {
  constructor(componentContext, tabContext) {
    this.ctx = componentContext; 
    this.tab = tabContext;       
    this.app = window.appInstance;
    this.isNew = !this.tab.targetRowId; 

    if (!this.tab.activeSubTab) this.tab.activeSubTab = 'properties';

    if (this.isNew) {
      this.formData = { 
        id: crypto.randomUUID(),
        parentId: this.tab.forcedParentId || null,
        _ownerContext: this.tab.ownerContext || null 
      };
      
      this.ctx.entity.columns.forEach(col => {
        const type = this.ctx.entity.columnTypes[col] || 'TEXT';
        if (type === 'BOOLEAN') this.formData[col] = false;
        else if (type === 'TIMESTAMP') this.formData[col] = { utc: Date.now(), offset: '+00:00', zoneName: 'UTC' };
        else this.formData[col] = '';
      });
      delete this.tab.forcedParentId;
    } else {
      const originalRow = this.ctx.entity.rows.find(r => r.id === this.tab.targetRowId);
      this.formData = JSON.parse(JSON.stringify(originalRow || {}));
      if (!this.formData.parentId) this.formData.parentId = null;
    }

    // Подключаем дочерние рендереры-сателлиты карточки
    this.fieldsGenerator = new DirectoryFormFields(this);
    this.tabsGenerator = new DirectoryFormTabs(this);
  }

  render() {
    const formWrapper = document.createElement('div');
    formWrapper.className = 'directory-form-container';
    formWrapper.style.cssText = 'display:flex; flex-direction:column; height:100%; box-sizing:border-box;';

    const firstColName = this.ctx.entity.columns[0];
    formWrapper.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; background:#f8fafc; padding:10px; border-radius:6px; border:1px solid #cbd5e1; flex-shrink:0;">
        <h3 style="margin:0; color:#1e293b; font-size:1.1rem;">
          ${this.isNew ? '➕ Создание нового элемента' : `📝 Карточка: ${this.formData[firstColName] || 'Редактирование'}`}
        </h3>
        <div style="display:flex; gap:10px;">
          <button id="form-cancel-btn" style="padding:6px 12px; background:#64748b; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.85rem;">Отмена</button>
          <button id="form-save-btn" style="padding:6px 12px; background:#10b981; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.85rem;">Сохранить</button>
        </div>
      </div>
      <div id="sub-tabs-bar" style="display:flex; background:#e2e8f0; border-bottom:1px solid #cbd5e1; border-radius:4px 4px 0 0; margin-bottom:15px; flex-shrink:0;"></div>
      <div id="sub-tab-content-area" style="flex-grow:1; overflow-y:auto; padding:5px;"></div>
    `;

    const tabsBar = formWrapper.querySelector('#sub-tabs-bar');
    const contentArea = formWrapper.querySelector('#sub-tab-content-area');

    // Делегируем прорисовку закладок и инпутов сателлитам
    this.tabsGenerator.render(tabsBar, contentArea);

    formWrapper.querySelector('#form-cancel-btn').addEventListener('click', () => this.app.tabsManager.closeTab(this.tab.id));
    formWrapper.querySelector('#form-save-btn').addEventListener('click', () => this.saveElementAction());

    return formWrapper;
  }

  async saveElementAction() {
    if (this.isNew) {
      this.ctx.entity.rows.push(this.formData);
    } else {
      const idx = this.ctx.entity.rows.findIndex(r => r.id === this.tab.targetRowId);
      if (idx !== -1) this.ctx.entity.rows[idx] = this.formData;
    }

    await this.ctx.onUpdate(this.ctx.entity);
    delete this.tab.activeSubTab;
    this.app.tabsManager.closeTab(this.tab.id);
  }
}
