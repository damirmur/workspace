// static/js/components/CanvasUIFactory.js
import { NoteCanvasComponent } from './NoteCanvasComponent.js';
import { ProjectCanvasComponent } from './ProjectCanvasComponent.js';
import { DirectoryCanvasComponent } from './directory/DirectoryCanvasComponent.js';
import { SkillCanvasComponent } from './skills/SkillCanvasComponent.js'; // ИМПОРТ

export class CanvasUIFactory {
  static create(entity, onUpdate, onDelete) {
    if (entity.type === 'note') return new NoteCanvasComponent(entity, onUpdate, onDelete);
    if (entity.type === 'project') return new ProjectCanvasComponent(entity, onUpdate, onDelete);
    if (entity.type === 'directory') return new DirectoryCanvasComponent(entity, onUpdate, onDelete);
    if (entity.type === 'skill') return new SkillCanvasComponent(entity, onUpdate, onDelete); // УСЛОВИЕ
    throw new Error(`Неизвестный тип сущности: ${entity.type}`);
  }
}