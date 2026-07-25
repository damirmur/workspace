// static/js/components/CanvasUIFactory.js
import { NoteCanvasComponent } from './NoteCanvasComponent.js';
import { ProjectCanvasComponent } from './ProjectCanvasComponent.js';
import { DirectoryCanvasComponent } from './directory/DirectoryCanvasComponent.js';
import { SkillCanvasComponent } from './skills/SkillCanvasComponent.js';

export class CanvasUIFactory {
  /**
   * Фабричный метод для создания и монтирования UI-компонентов холста
   * @param {Object} entity - Данные сущности из базы данных IndexedDB
   * @param {Object} tabContext - Объект текущей вкладки (содержит viewMode, targetRowId, callback)
   * @param {Function} onUpdate - Коллбек для сохранения изменений в IndexedDB
   * @param {Function} onDelete - Коллбек для удаления сущности из сайдбара/БД
   * @returns {Object} Экземпляр соответствующего компонента холста
   */
  static create(entity, tabContext, onUpdate, onDelete) {
    switch (entity.type) {
      case 'note':
        return new NoteCanvasComponent(entity, onUpdate, onDelete);
        
      case 'project':
        return new ProjectCanvasComponent(entity, onUpdate, onDelete);
        
      case 'directory':
        // Справочник получает контекст вкладки, чтобы переключаться между Таблицей и Формой карточки
        return new DirectoryCanvasComponent(entity, tabContext, onUpdate, onDelete);
        
      case 'skill':
        return new SkillCanvasComponent(entity, onUpdate, onDelete);
        
      default:
        throw new Error(`[CanvasUIFactory]: Неизвестный или неподдерживаемый тип сущности: ${entity.type}`);
    }
  }
}
