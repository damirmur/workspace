// static/js/components/CanvasUIFactory.js
import { NoteCanvasComponent } from './NoteCanvasComponent.js';
import { ProjectCanvasComponent } from './ProjectCanvasComponent.js';
import { DirectoryCanvasComponent } from './directory/table/DirectoryCanvasComponent.js';
import { DirectoryFormComponent } from './directory/form/DirectoryFormComponent.js';
import { SkillCanvasComponent } from './skills/SkillCanvasComponent.js';

export class CanvasUIFactory {
  /**
   * Умный фабричный метод сборки интерфейса холста
   */
  static create(entity, tabContext, onUpdate, onDelete) {
    switch (entity.type) {
      case 'note':
        return new NoteCanvasComponent(entity, onUpdate, onDelete);
        
      case 'project':
        return new ProjectCanvasComponent(entity, onUpdate, onDelete);
        
      case 'directory':
        // === ВЕТВЛЕНИЕ НА УРОВНЕ ФАБРИКИ ===
        // Если вкладка просит отобразить карточку, собираем форму напрямую
        if (tabContext.viewMode === 'form') {
          // Создаем фиктивный контекст справочника для формы, чтобы не ломать логику onUpdate/onDelete
          const mockDirectoryCanvas = {
            entity: entity,
            app: window.appInstance,
            onUpdate: onUpdate,
            onDelete: onDelete
          };
          return new DirectoryFormComponent(mockDirectoryCanvas, tabContext);
        }
        
        // Иначе строим стандартную таблицу-реестр
        return new DirectoryCanvasComponent(entity, tabContext, onUpdate, onDelete);
        
      case 'skill':
        return new SkillCanvasComponent(entity, onUpdate, onDelete);
        
      default:
        throw new Error(`[CanvasUIFactory]: Неизвестный тип сущности: ${entity.type}`);
    }
  }
}
