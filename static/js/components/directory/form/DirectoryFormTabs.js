// static/js/components/directory/form/DirectoryFormTabs.js
import { DirectoryCanvasComponent } from '../table/DirectoryCanvasComponent.js';

export class DirectoryFormTabs {
  constructor(formContext) {
    this.form = formContext; 
  }

  render(tabsBarElement, contentAreaElement) {
    tabsBarElement.innerHTML = '';
    contentAreaElement.innerHTML = '';

    const subTabsConfig = [{ id: 'properties', title: '📋 Основные свойства' }];

    if (!this.form.isNew && Array.isArray(this.form.ctx.entity.allowedSubDirectories)) {
      this.form.ctx.entity.allowedSubDirectories.forEach(relConfig => {
        const childDir = this.form.app.entities.find(e => e.id === relConfig.childDirectoryId);
        if (childDir) {
          
          // АЛГОРИТМ ПОДСЧЕТА СТРОК: Проверяем связи с учетом ONE_TO_MANY или MANY_TO_MANY
          const childRowsCount = (childDir.rows || []).filter(row => {
            if (!row._ownerContext) return false;

            if (relConfig.relationType === 'MANY_TO_MANY' && Array.isArray(row._ownerContext)) {
              // Ищем совпадение в массиве контекстов владельцев
              return row._ownerContext.some(ctx => 
                String(ctx.directoryId) === String(this.form.ctx.entity.id) && 
                String(ctx.rowId) === String(this.form.formData.id)
              );
            } else if (relConfig.relationType === 'ONE_TO_MANY' && !Array.isArray(row._ownerContext)) {
              // Прямое сопоставление одиночного эксклюзивного владельца
              return String(row._ownerContext.directoryId) === String(this.form.ctx.entity.id) && 
                     String(row._ownerContext.rowId) === String(this.form.formData.id);
            }
            return false;
          }).length;

          subTabsConfig.push({
            id: `subdir_${childDir.id}`,
            title: `🗂️ ${childDir.title} (${childRowsCount})`,
            childDir: childDir,
            relationType: relConfig.relationType
          });
        }
      });
    }

    subTabsConfig.forEach(subTab => {
      const btn = document.createElement('button');
      const isSubActive = this.form.tab.activeSubTab === subTab.id;
      
      btn.style.cssText = `
        padding: 8px 16px; border:none; background:${isSubActive ? 'white' : 'transparent'};
        color:${isSubActive ? '#0284c7' : '#475569'}; font-weight:${isSubActive ? '600' : 'normal'};
        border-bottom: 2px solid ${isSubActive ? '#0284c7' : 'transparent'}; cursor:pointer; font-size:0.85rem;
      `;
      btn.textContent = subTab.title;
      
      btn.addEventListener('click', () => {
        this.form.tab.activeSubTab = subTab.id;
        this.form.app.tabsManager.renderCanvasContent(); 
      });

      tabsBarElement.appendChild(btn);
    });

    const activeConfig = subTabsConfig.find(t => t.id === this.form.tab.activeSubTab) || subTabsConfig[0];
    this.mountContent(contentAreaElement, activeConfig);
  }

  mountContent(contentAreaElement, subTabConfig) {
    if (subTabConfig.id === 'properties') {
      this.form.fieldsGenerator.render(contentAreaElement);
    } else {
      const childDir = subTabConfig.childDir;
      
      const subTableTabContext = {
        id: `subtable_tab_${childDir.id}`,
        entityId: childDir.id,
        viewMode: 'table',
        viewType: 'table',
        ownerContext: {
          directoryId: this.form.ctx.entity.id,
          rowId: this.form.formData.id,
          relationType: subTabConfig.relationType // Прокидываем спроектированный тип связи подтаблице
        }
      };

      const subTableComponent = new DirectoryCanvasComponent(
        childDir,
        subTableTabContext,
        (updatedChildDir) => this.form.app.updateEntity(updatedChildDir),
        (id) => this.form.app.deleteEntity(id)
      );

      contentAreaElement.appendChild(subTableComponent.render());
    }
  }
}
