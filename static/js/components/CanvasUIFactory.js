import { NoteCanvasComponent } from './NoteCanvasComponent.js';
import { ProjectCanvasComponent } from './ProjectCanvasComponent.js';
import { DirectoryCanvasComponent } from './DirectoryCanvasComponent.js'; // Импортируем

export class CanvasUIFactory {
  static create(entity, onUpdate, onDelete) {
    if (entity.type === 'note') return new NoteCanvasComponent(entity, onUpdate, onDelete);
    if (entity.type === 'project') return new ProjectCanvasComponent(entity, onUpdate, onDelete);
    if (entity.type === 'directory') return new DirectoryCanvasComponent(entity, onUpdate, onDelete); // Добавляем условие
    throw new Error(`Неизвестный тип сущности: ${entity.type}`);
  }
}