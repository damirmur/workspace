// static/js/fields/FieldRegistry.js

// Функция точного определения временной зоны браузера (например: "Europe/Moscow")
function guessBrowserZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone; // Встроено в любой современный браузер
  } catch (e) {
    return "UTC";
  }
}

// Функция получения текущего смещения в формате ±ЧЧ:ММ (как фоллбэк)
function getBrowserOffset() {
  const offsetMinutes = -new Date().getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absMinutes = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absMinutes / 60)).padStart(2, '0');
  const mins = String(absMinutes % 60).padStart(2, '0');
  return `${sign}${hours}:${mins}`;
}

class TimeZoneConverter {
  // Перевод UTC Timestamp во внутреннюю строку инпута с учетом заданного смещения
  static utcToLocalInputString(utcTimestamp, offsetStr) {
    if (!utcTimestamp) return '';
    const sign = offsetStr.startsWith('+') ? 1 : -1;
    const [h, m] = offsetStr.slice(1).split(':').map(Number);
    const offsetMs = (h * 60 + m) * 60000 * sign;
    
    const localDate = new Date(utcTimestamp + offsetMs);
    return localDate.toISOString().slice(0, 16);
  }

  // Перевод строки из инпута в честный UTC Timestamp с вычетом смещения
  static inputStringToUTC(inputString, offsetStr) {
    if (!inputString) return null;
    const fakeUTC = new Date(inputString + ':00Z').getTime();
    const sign = offsetStr.startsWith('+') ? 1 : -1;
    const [h, m] = offsetStr.slice(1).split(':').map(Number);
    const offsetMs = (h * 60 + m) * 60000 * sign;
    return fakeUTC - offsetMs;
  }
}

export const FieldTypes = {
  // Поля TEXT, NUMBER, BOOLEAN остаются без изменений...
  TEXT: {
    renderView: (val) => val || '',
    renderEdit: (val, onChange) => {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = val || '';
      input.addEventListener('blur', () => onChange(input.value));
      return input;
    }
  },
  NUMBER: {
    renderView: (val) => val !== undefined && val !== null ? val : '',
    renderEdit: (val, onChange) => {
      const input = document.createElement('input');
      input.type = 'number';
      input.value = val || '';
      input.addEventListener('blur', () => onChange(input.value ? Number(input.value) : 0));
      return input;
    }
  },
  BOOLEAN: {
    renderView: (val) => val ? '✅' : '❌',
    renderEdit: (val, onChange) => {
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = !!val;
      input.addEventListener('change', () => onChange(input.checked));
      return input;
    }
  },

  // ПОЛНОСТЬЮ ИСПРАВЛЕННЫЙ ТИП TIMESTAMP С ДЕТЕКЦИЕЙ И РЕДАКТИРОВАНИЕМ
  TIMESTAMP: {
    renderView: (val) => {
      if (!val || !val.utc) return '-';
      const dateStr = new Date(val.utc).toLocaleString();
      return `${dateStr} (${val.zoneName || 'UTC' + val.offset})`;
    },
    renderEdit: (val, onChange) => {
      const availableZones = window.serverTimezones || [{ name: "UTC", offset: "+00:00" }];
      
      // Автоопределение зоны браузера для подстановки в пустые ячейки
      const detectedZoneName = guessBrowserZone();
      const matchedZone = availableZones.find(z => z.name === detectedZoneName);
      
      const defaultOffset = matchedZone ? matchedZone.offset : getBrowserOffset();
      const defaultZoneName = matchedZone ? matchedZone.name : 'Local';

      // Формируем начальное состояние данных для ячейки
      const cellData = {
        utc: val && val.utc ? val.utc : Date.now(),
        offset: val && val.offset ? val.offset : defaultOffset,
        zoneName: val && val.zoneName ? val.zoneName : defaultZoneName
      };

      const container = document.createElement('div');
      container.style.display = 'flex';
      container.style.gap = '5px';
      container.style.alignItems = 'center';
      
      // Чтобы клики внутри контейнера (по селектору или инпуту) не закрывали ячейку раньше времени
      container.addEventListener('click', (e) => e.stopPropagation());

      // 1. Инпут даты
      const input = document.createElement('input');
      input.type = 'datetime-local';
      input.style.fontSize = '0.85rem';
      input.value = TimeZoneConverter.utcToLocalInputString(cellData.utc, cellData.offset);

      // 2. Селектор зон
      const select = document.createElement('select');
      select.style.fontSize = '0.8rem';
      
      availableZones.forEach(zone => {
        const opt = document.createElement('option');
        opt.value = zone.offset;
        opt.dataset.name = zone.name;
        opt.textContent = `${zone.name} (UTC${zone.offset})`;
        
        // Подсвечиваем сохраненную или автоматически определенную зону
        if (zone.name === cellData.zoneName) {
          opt.selected = true;
        }
        select.appendChild(opt);
      });

      // Единая функция фиксации изменений
      const commitChanges = () => {
        const selectedOption = select.options[select.selectedIndex];
        cellData.offset = select.value;
        cellData.zoneName = selectedOption ? selectedOption.dataset.name : 'Unknown';
        cellData.utc = TimeZoneConverter.inputStringToUTC(input.value, select.value);
        onChange(cellData); // Отправляем объект {utc, offset, zoneName} в Справочник
      };

      // Событие: Пользователь изменил город в выпадающем списке
      select.addEventListener('change', () => {
        // Пересчитываем стрелки часов в инпуте под новую выбранную зону
        input.value = TimeZoneConverter.utcToLocalInputString(cellData.utc, select.value);
        commitChanges();
      });

      // Событие: Пользователь завершил ввод даты/времени
      input.addEventListener('blur', commitChanges);

      container.appendChild(input);
      container.appendChild(select);
      return container;
    }
  },

  // Поля JSON и ZIP_FILE остаются без изменений...
  JSON: {
    renderView: (val) => {
      try {
        return typeof val === 'object' ? JSON.stringify(val) : String(val);
      } catch { return 'Ошибка JSON'; }
    },
    renderEdit: (val, onChange) => {
      const container = document.createElement('div');
      container.addEventListener('click', (e) => e.stopPropagation());
      
      const textarea = document.createElement('textarea');
      textarea.style.width = '100%';
      textarea.style.height = '60px';
      // Выводим объект в красивом многострочном формате
      textarea.value = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val || '{}');
      
      const errorMsg = document.createElement('div');
      errorMsg.style.cssText = 'color:#dc3545; font-size:0.75rem; display:none;';
      errorMsg.textContent = '❌ Невалидный JSON';

      textarea.addEventListener('blur', () => {
        const rawText = textarea.value.trim();
        if (!rawText) {
          errorMsg.style.display = 'none';
          onChange({});
          return;
        }

        // 1. Пробуем стандартный строгий JSON-парсинг
        try {
          const parsed = JSON.parse(rawText);
          errorMsg.style.display = 'none';
          onChange(parsed);
          return;
        } catch (e) {
          // Игнорируем ошибку и переходим к шагу 2
        }

        // 2. Шаг автоисправления: пробуем прочитать как мягкий JS-объект (без кавычек)
        try {
          // Безопасный запуск разбора выражения в изолированной функции
          const looseParsed = new Function(`return (${rawText});`)();
          
          if (looseParsed && typeof looseParsed === 'object') {
            errorMsg.style.display = 'none';
            // Сами форматируем в строгий JSON с двойными кавычками для нормального сохранения
            textarea.value = JSON.stringify(looseParsed, null, 2); 
            onChange(looseParsed);
            return;
          }
        } catch (err) {
          // Если упали оба варианта — объект действительно сломан структурно
        }

        // Если ничего не помогло, показываем ошибку
        errorMsg.style.display = 'block';
      });

      container.appendChild(textarea);
      container.appendChild(errorMsg);
      return container;
    }
  },
 ZIP_FILE: {
    renderView: (val) => {
      if (!val || !val.fileName) return '📎 Пусто';
      return `📦 ${val.fileName} (${(val.size / 1024).toFixed(1)} KB)`;
    },
    renderEdit: (val, onChange) => {
      const container = document.createElement('div');
      container.addEventListener('click', (e) => e.stopPropagation());
      container.innerHTML = `
        <input type="file" style="display:none;" id="zip-file-picker">
        <button id="zip-upload-btn" style="padding:2px 6px; font-size:0.8rem; cursor:pointer;">Загрузить</button>
        <span id="zip-info" style="font-size:0.8rem; margin-left:5px;"></span>
      `;
      const filePicker = container.querySelector('#zip-file-picker');
      const uploadBtn = container.querySelector('#zip-upload-btn');
      const infoSpan = container.querySelector('#zip-info');

      // Если файл уже есть в базе данных
      if (val && val.fileName) {
        const cleanName = val.fileName.replace(/^\uFEFF/, '');
        infoSpan.textContent = cleanName;
        
        // 1. Кнопка СКАЧИВАНИЯ
        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = '💾';
        downloadBtn.title = 'Скачать файл';
        downloadBtn.style.cssText = 'border:none; background:none; cursor:pointer; margin-left:5px;';
        downloadBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const blob = new Blob([new Uint8Array(val.payload)], {type: "application/zip"});
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = cleanName;
          a.click();
          URL.revokeObjectURL(url);
        });
        container.appendChild(downloadBtn);

        // 2. НОВАЯ КНОПКА УДАЛЕНИЯ (Очистки поля)
        const deleteFileBtn = document.createElement('button');
        deleteFileBtn.textContent = '🗑️';
        deleteFileBtn.title = 'Удалить файл из ячейки';
        deleteFileBtn.style.cssText = 'border:none; background:none; cursor:pointer; margin-left:5px; color:#dc3545;';
        deleteFileBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`Вы уверены, что хотите удалить файл "${cleanName}" из этой ячейки?`)) {
            infoSpan.textContent = '';
            // Передаем null, чтобы полностью стереть объект файла и освободить память в IndexedDB
            onChange(null); 
          }
        });
        container.appendChild(deleteFileBtn);
      }

      uploadBtn.addEventListener('click', (e) => { e.stopPropagation(); filePicker.click(); });
      
      filePicker.addEventListener('change', async (e) => {
        const file = e.target.files[0]; 
        if (!file) return;

        infoSpan.textContent = 'Загрузка...';
        
        try {
          const reader = new FileReader();
          reader.onload = async (evt) => {
            const arrayBuffer = evt.target.result;
            let sanitizedName = file.name.replace(/^\uFEFF/, '');
            if (!sanitizedName.toLowerCase().endsWith('.zip')) {
              sanitizedName += '.zip';
            }

            const fileData = {
              fileName: sanitizedName,
              size: file.size,
              payload: Array.from(new Uint8Array(arrayBuffer))
            };
            
            infoSpan.textContent = fileData.fileName;
            onChange(fileData);
          };
          reader.readAsArrayBuffer(file); 
        } catch (err) { 
          infoSpan.textContent = 'Ошибка ZIP'; 
          console.error(err); 
        }
      });
      return container;
    }
  },
    RELATION: {
    // Режим отображения в таблице или карточке
    renderView: (val, colName, currentEntity) => {
      if (!val) return '—';
      
      // Находим, на какой справочник ссылается эта колонка
      const targetDirectoryId = currentEntity.relationTargets?.[colName];
      if (!targetDirectoryId || !window.appInstance) return '—';

      // Ищем целевой справочник среди загруженных сущностей приложения
      const targetDir = window.appInstance.entities.find(e => e.id === targetDirectoryId);
      if (!targetDir || !targetDir.rows) return '[Справочник не найден]';

      // Ищем конкретную строку по сохраненному UUID
      const connectedRow = targetDir.rows.find(r => r.id === val);
      if (!connectedRow) return '[Элемент удален]';

      // Берем значение из самой первой колонки целевого справочника в качестве имени ссылки
      const firstColumnName = targetDir.columns[0];
      return connectedRow[firstColumnName] || `[Элемент без имени #Header]`;
    },

    // Режим редактирования (генерация селектора + кнопка создания на лету)
    renderEdit: (val, onChange, colName, currentEntity, currentTabId, currentSourceRowId) => {
      const container = document.createElement('div');
      container.style.cssText = 'display:flex; gap:5px; align-items:center; width:100%;';
      container.addEventListener('click', (e) => e.stopPropagation());

      // Узнаем ID справочника, с которым строим связь
      const targetDirectoryId = currentEntity.relationTargets?.[colName];
      
      const select = document.createElement('select');
      select.style.cssText = 'flex-grow:1; padding:4px; font-size:0.9rem; border-radius:4px; border:1px solid #ccc;';
      
      // Опция по умолчанию "Не выбрано"
      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = '-- Выберите элемент --';
      select.appendChild(defaultOpt);

      let targetDir = null;
      if (targetDirectoryId && window.appInstance) {
        targetDir = window.appInstance.entities.find(e => e.id === targetDirectoryId);
      }

      // Наполняем выпадающий список данными из целевого справочника, если он существует
      if (targetDir && targetDir.rows) {
        const firstCol = targetDir.columns[0];
        targetDir.rows.forEach(row => {
          const opt = document.createElement('option');
          opt.value = row.id;
          opt.textContent = row[firstCol] || `[ID: ${row.id.slice(0,6)}]`;
          if (row.id === val) opt.selected = true;
          select.appendChild(opt);
        });
      }

      // Слушатель выбора элемента из существующих
      select.addEventListener('change', () => {
        onChange(select.value || null);
      });

      container.appendChild(select);

      // ЕСЛИ МЫ НАХОДИМСЯ В ФОРМЕ (передан ID строки источника), добавляем кнопку "+ На лету"
      if (currentSourceRowId && targetDir) {
        const quickAddBtn = document.createElement('button');
        quickAddBtn.textContent = '➕';
        quickAddBtn.title = `Создать новый элемент в справочнике "${targetDir.title}" на лету`;
        quickAddBtn.style.cssText = 'padding:4px 8px; font-size:0.9rem; cursor:pointer; background:#e7f3ff; border:1px solid #b3d7ff; color:#0066cc; border-radius:4px; font-weight:bold;';
        
        quickAddBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          
          if (!window.appInstance || !window.appInstance.tabsManager) {
            console.error("Менеджер вкладок недоступен для создания на лету.");
            return;
          }

          // Запускаем ООП-сценарий: просим оркестратор открыть форму создания в целевом справочнике
          window.appInstance.tabsManager.openTab({
            entityId: targetDir.id,
            title: `Новый в "${targetDir.title}" (На лету)`,
            type: 'directory',
            viewMode: 'form',       // Режим карточки
            targetRowId: null,      // null означает, что это создание новой записи
            
            // Передаем билет возврата (callback) для синхронизации вкладок
            callback: {
              sourceTabId: currentTabId,       // Кто запросил данные
              sourceRowId: currentSourceRowId, // Какую конкретно строку обновить при возврате
              sourceColumn: colName            // Какую ячейку заполнить
            }
          });
        });

        container.appendChild(quickAddBtn);
      }

      return container;
    }
  }

};