import { BaseCanvasComponent } from './BaseCanvasComponent.js';

export class NoteCanvasComponent extends BaseCanvasComponent {
  render() {
    const wrapper = document.createElement('div');
    wrapper.className = 'note-workspace';
    wrapper.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h2 id="note-title-text" style="margin:0; padding:4px; border-radius:4px;">${this.entity.title}</h2>
        <button id="note-delete-btn" style="padding: 8px 16px; background:#dc3545; color:white; border:none; border-radius:4px; cursor:pointer;">
          Удалить заметку
        </button>
      </div>
      <textarea id="note-content" style="width:100%; height:300px; padding:10px; box-sizing:border-box; margin-top:15px;">${this.entity.content || ''}</textarea>
    `;

    const titleHeader = wrapper.querySelector('#note-title-text');
    const contentText = wrapper.querySelector('#note-content');
    const deleteBtn = wrapper.querySelector('#note-delete-btn');

    // Инлайновое переименование заголовка заметки при клике
    if (titleHeader) {
      this.makeEditable(titleHeader, (newTitle) => {
        this.entity.title = newTitle;
        this.onUpdate(this.entity);
      });
    }

    if (contentText) {
      contentText.addEventListener('input', () => {
        this.entity.content = contentText.value;
        this.onUpdate(this.entity);
      });
    }
    
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        if (confirm(`Вы уверены, что хотите удалить заметку "${this.entity.title}"?`)) {
          this.onDelete(this.entity.id);
        }
      });
    }

    return wrapper;
  }
}