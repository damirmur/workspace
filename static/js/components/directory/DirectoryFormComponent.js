// static/js/components/directory/DirectoryFormComponent.js
import { FieldTypes } from '../../fields/FieldRegistry.js';

export class DirectoryFormComponent {
  constructor(componentContext, tabContext) {
    this.ctx = componentContext; // Ссылка на управляющий DirectoryCanvasComponent
    this.tab = tabContext;       // Ссылка на объект текущей активной вкладки
    
    this.isNew = !this.tab.targetRowId; // Флаг: создание новой строки или редактирование старой
    
    // Инициализируем локальный слепок (черновик карточки)
    if (this.isNew) {
      this.formData = { id: crypto.randomUUID() }; // Сразу генерируем постоянный UUID для связи "на лету"
      this.ctx.entity.columns.forEach(col => {
        const type = this.ctx.entity.columnTypes[col] || 'TEXT';
        if (type === 'BOOLEAN') this.formData[col] = false;
        else if (type === 'TIMESTAMP') this.formData[col] = { utc: Date.now(), offset: '+00:00', zoneName: 'UTC' };
        else this.formData[col] = '';
      });
    } else {
      // Глубокое клонирование строки из БД, чтобы не мутировать таблицу до нажатия кнопки "Сохранить"
      const originalRow = this.ctx.entity.rows.find(r => r.id === this.tab.targetRowId);
      this.formData = JSON.parse(JSON.stringify(originalRow || {}));
    }
  }

  render() {
    const formWrapper = document.createElement('div');
    formWrapper.className = 'directory-form-container';
    formWrapper.style.cssText = 'max-width:650px; margin:20px auto; padding:25px; background:#f8f9fa; border-radius:8px; border:1px solid #cbd5e1; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);';

    formWrapper.innerHTML = `
      <h3 style="margin-top:0; border-bottom:1px solid #cbd5e1; padding-bottom:12px; color:#1e293b; font-size:1.2rem; display:flex; align-items:center; gap:8px;">
        ${this.isNew ? '➕ Добавление новой карточки' : '📝 Редактирование карточки'}
      </h3>
      <div id="form-fields-list" style="display:flex; flex-direction:column; gap:18px; margin-bottom:25px; margin-top:15px;"></div>
      <div style="display:flex; gap:10px; justify-content:flex-end; border-top:1px solid #cbd5e1; padding-top:18px;">
        <button id="form-cancel-btn" style="padding:8px 16px; background:#64748b; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.9rem;">Отмена</button>
        <button id="form-save-btn" style="padding:8px 16px; background:#10b981; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.9rem;">Сохранить</button>
        ${this.tab.callback ? '<button id="form-save-select-btn" style="padding:8px 16px; background:#2563eb; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.9rem;">Сохранить и Выбрать</button>' : ''}
      </div>
    `;

    const fieldsContainer = formWrapper.querySelector('#form-fields-list');

    // Генерация инпутов на основе типов данных колонок текущего справочника
    this.ctx.entity.columns.forEach(colName => {
      const type = this.ctx.entity.columnTypes[colName] || 'TEXT';
      
      const fieldBlock = document.createElement('div');
      fieldBlock.style.cssText = 'display:flex; flex-direction:column; gap:6px;';
      fieldBlock.innerHTML = `<label style="font-weight:600; font-size:0.875rem; color:#334155;">${colName}</label>`;

      let inputElement;

      // 1. Отображение поля Описание в виде полноценного textarea
      if (type === 'TEXT' && colName.toLowerCase().includes('описание')) {
        const textarea = document.createElement('textarea');
        textarea.style.cssText = 'width:100%; height:120px; padding:10px; box-sizing:border-box; border:1px solid #cbd5e1; border-radius:4px; font-family:inherit; font-size:0.9rem; resize:vertical;';
        textarea.value = this.formData[colName] || '';
        textarea.addEventListener('input', () => { this.formData[colName] = textarea.value; });
        inputElement = textarea;
      } 
      // 2. Использование полиморфной фабрики полей для всех остальных типов (включая RELATION)
      else {
        const processor = FieldTypes[type];
        // Передаем расширенную сигнатуру аргументов для поддержки связей
        inputElement = processor.renderEdit(
          this.formData[colName], 
          (newValue) => { this.formData[colName] = newValue; },
          colName,
          this.ctx.entity,
          this.tab.id,        // ID текущей вкладки-формы
          this.formData.id    // UUID текущей строки (Ивана)
        );
      }

      fieldBlock.appendChild(inputElement);
      fieldsContainer.appendChild(fieldBlock);
    });

    // Привязка обработчиков кнопок управления карточкой
    formWrapper.querySelector('#form-cancel-btn').addEventListener('click', () => {
      // Закрываем вкладку формы без сохранения изменений
      this.ctx.app.tabsManager.closeTab(this.tab.id);
    });

    formWrapper.querySelector('#form-save-btn').addEventListener('click', () => {
      this.saveElementAction(false);
    });

    if (this.tab.callback) {
      formWrapper.querySelector('#form-save-select-btn').addEventListener('click', () => {
        this.saveElementAction(true); // Сохранить и выполнить возврат UUID на лету
      });
    }

    return formWrapper;
  }

  /**
   * Запись изменений черновика формы в IndexedDB
   * @param {boolean} shouldSelectAndClose - Флаг активации сессии возврата "на лету"
   */
  async saveElementAction(shouldSelectAndClose) {
    if (this.isNew) {
      // Добавляем созданный объект в массив строк сущности
      this.ctx.entity.rows.push(this.formData);
    } else {
      // Обновляем существующий объект по его id
      const idx = this.ctx.entity.rows.findIndex(r => r.id === this.tab.targetRowId);
      if (idx !== -1) this.ctx.entity.rows[idx] = this.formData;
    }

    // Сохраняем агрегированное состояние текущего справочника в IndexedDB и запускаем Debounce
    await this.ctx.onUpdate(this.ctx.entity);

    // СЦЕНАРИЙ "НА ЛЕТУ": Передаем UUID созданной карточки в родительскую ячейку
    if (shouldSelectAndClose && this.tab.callback) {
      const sourceTabId = this.tab.callback.sourceTabId;
      const sourceRowId = this.tab.callback.sourceRowId;
      const sourceColumn = this.tab.callback.sourceColumn;

      // Ищем вкладку-создателя в менеджере вкладок
      const sourceTab = this.ctx.app.tabsManager.tabs.find(t => t.id === sourceTabId);
      if (sourceTab) {
        // Находим саму сущность создателя (например, Справочник Договоры)
        const creatorEntity = this.ctx.app.entities.find(e => e.id === sourceTab.entityId);
        if (creatorEntity && creatorEntity.rows) {
          // Находим строку Договора, из которой была нажата кнопка связи
          const targetedRow = creatorEntity.rows.find(r => r.id === sourceRowId);
          if (targetedRow) {
            // Записываем UUID нового Контакта в ячейку "Клиент" Договора
            targetedRow[sourceColumn] = this.formData.id; 
            // Сохраняем Справочник-создатель в базу данных
            await this.ctx.app.updateEntity(creatorEntity);
          }
        }
      }
      
      // Закрываем вкладку формы, фокус автоматически вернется на родительский документ
      this.ctx.app.tabsManager.closeTab(this.tab.id);
    } else {
      // При обычном сохранении переводим текущую вкладку обратно в табличный вид
      this.tab.viewMode = 'table';
      this.tab.targetRowId = null;
      this.ctx.saveAndRefresh(); // Перерисовываем Canvas через оркестратор справочника
    }
  }
}
