export class BaseCanvasComponent {
  constructor(entity, onUpdate, onDelete) {
    if (new.target === BaseCanvasComponent) {
      throw new TypeError("Нельзя создавать экземпляр абстрактного класса напрямую.");
    }
    this.entity = entity;
    this.onUpdate = onUpdate;
    this.onDelete = onDelete;
  }

  // Вспомогательный метод для инлайнового редактирования заголовков/текста
  makeEditable(element, onSave) {
    element.style.cursor = 'pointer';
    element.title = 'Нажмите для редактирования';
    
    element.addEventListener('click', (e) => {
      e.stopPropagation();
      const currentText = element.textContent.trim();
      const input = document.createElement('input');
      input.type = 'text';
      input.value = currentText;
      input.style.font = window.getComputedStyle(element).font;
      input.style.width = `${Math.max(element.offsetWidth, 150)}px`;
      input.style.padding = '2px 5px';

      const saveChanges = () => {
        const newValue = input.value.trim();
        if (newValue && newValue !== currentText) {
          element.textContent = newValue;
          onSave(newValue);
        } else {
          element.textContent = currentText;
        }
      };

      input.addEventListener('blur', saveChanges);
      input.addEventListener('keydown', (evt) => {
        if (evt.key === 'Enter') saveChanges();
        if (evt.key === 'Escape') {
          element.textContent = currentText;
        }
      });

      element.textContent = '';
      element.appendChild(input);
      input.focus();
      input.select();
    });
  }

  render() {
    throw new Error('Метод render() должен быть реализован в дочернем классе');
  }
}