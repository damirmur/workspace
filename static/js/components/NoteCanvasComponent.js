// static/js/components/NoteCanvasComponent.js
import { BaseCanvasComponent } from './BaseCanvasComponent.js';

export class NoteCanvasComponent extends BaseCanvasComponent {
  render() {
    const wrapper = document.createElement('div');
    wrapper.className = 'note-workspace';
    wrapper.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <h2 id="note-title-text" style="margin:0; padding:4px; border-radius:4px;">${this.entity.title}</h2>
        <button id="note-delete-btn" style="padding: 8px 16px; background:#dc3545; color:white; border:none; border-radius:4px; cursor:pointer;">
          Удалить заметку
        </button>
      </div>
      
      <!-- Панель интерактивного поиска внутри контента заметки -->
      <div style="background:#f1f3f5; padding:10px; border-radius:4px; margin-bottom:15px; display:flex; gap:10px; align-items:center;">
        <span style="font-size:0.9rem; color:#4a5568;">🔍 Поиск в заметке:</span>
        <input type="text" id="note-search-input" placeholder="Введите текст для проверки совпадений..." style="flex-grow:1; padding:6px; border:1px solid #cbd5e0; border-radius:4px;">
        <span id="note-search-status" style="font-size:0.85rem; font-weight:bold; color:#718096;"></span>
      </div>

      <textarea id="note-content" style="width:100%; height:300px; padding:10px; box-sizing:border-box; border:1px solid #cbd5e0; border-radius:4px; font-family:monospace; line-height:1.5;">${this.entity.content || ''}</textarea>
    `;

    const titleHeader = wrapper.querySelector('#note-title-text');
    const contentText = wrapper.querySelector('#note-content');
    const deleteBtn = wrapper.querySelector('#note-delete-btn');
    const searchInput = wrapper.querySelector('#note-search-input');
    const searchStatus = wrapper.querySelector('#note-search-status');

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
        runSearch(); // Пересчитываем совпадения при изменении текста
      });
    }

    // Логика интерактивного поиска совпадений по Названию и Содержанию
    const runSearch = () => {
      const query = searchInput.value.toLowerCase().trim();
      if (!query) {
        searchStatus.textContent = '';
        contentText.style.background = '#fff';
        return;
      }

      const matchInTitle = this.entity.title.toLowerCase().includes(query);
      const matchInContent = this.entity.content.toLowerCase().includes(query);

      if (matchInTitle || matchInContent) {
        let statusText = '✓ Найдено: ';
        if (matchInTitle) statusText += '[в заголовке] ';
        if (matchInContent) {
          // Считаем количество вхождений строки в текст
          const count = this.entity.content.toLowerCase().split(query).length - 1;
          statusText += `[в тексте: ${count} раз(а)]`;
        }
        searchStatus.textContent = statusText;
        searchStatus.style.color = '#137333';
        contentText.style.background = '#e6f4ea'; // Мягкая зеленая подсветка поля
      } else {
        searchStatus.textContent = '✕ Совпадений не найдено';
        searchStatus.style.color = '#c5221f';
        contentText.style.background = '#fce8e6'; // Мягкая красная подсветка
      }
    };

    if (searchInput) {
      searchInput.addEventListener('input', runSearch);
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