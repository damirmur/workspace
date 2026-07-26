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
      if (!val || !Array.isArray(val) || val.length === 0) return '📎 Пусто';
      const totalSize = val.reduce((acc, f) => acc + (f.size || 0), 0);
      const fileWord = val.length === 1 ? 'файл' : (val.length < 5 ? 'файла' : 'файлов');
      return `📦 ${val.length} ${fileWord} (сжато до ${(totalSize / 1024).toFixed(1)} KB)`;
    },

    renderEdit: (val, onChange) => {
      let filesList = [];
      if (Array.isArray(val)) {
        filesList = val;
      } else if (val && val.fileName) {
        filesList = [{ id: crypto.randomUUID(), ...val }];
      }

      const container = document.createElement('div');
      container.className = 'zip-file-manager';
      container.style.cssText = 'display:flex; flex-direction:column; gap:8px; width:100%; max-width:400px; background:#f8fafc; padding:8px; border-radius:6px; border:1px solid #cbd5e1;';
      container.addEventListener('click', (e) => e.stopPropagation());

      container.innerHTML = `
        <input type="file" style="display:none;" id="zip-file-picker" multiple>
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:6px; margin-bottom:4px;">
          <span style="font-size:0.8rem; font-weight:600; color:#475569;">Файловый менеджер (ZIP)</span>
          <button id="zip-add-btn" style="padding:3px 8px; font-size:0.8rem; background:#0ea5e9; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">+ Добавить</button>
        </div>
        <div id="zip-files-queue" style="display:flex; flex-direction:column; gap:4px; max-height:150px; overflow-y:auto;"></div>
      `;

      const filePicker = container.querySelector('#zip-file-picker');
      const addBtn = container.querySelector('#zip-add-btn');
      const queueContainer = container.querySelector('#zip-files-queue');

      const renderQueue = () => {
        queueContainer.innerHTML = '';
        if (filesList.length === 0) {
          queueContainer.innerHTML = '<span style="font-size:0.75rem; color:#94a3b8; font-style:italic; text-align:center; padding:4px;">Файлов нет</span>';
          return;
        }

        filesList.forEach((fileObj) => {
          const item = document.createElement('div');
          const cleanName = fileObj.fileName.replace(/^\uFEFF/, '');

          item.style.cssText = 'display:flex; align-items:center; justify-content:space-between; background:white; padding:4px 6px; border-radius:4px; border:1px solid #e2e8f0; font-size:0.75rem; gap:10px;';
          item.innerHTML = `
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex-grow:1; color:#1e293b;" title="${cleanName}">📄 ${cleanName}</span>
            <div style="display:flex; gap:2px; flex-shrink:0; align-items:center;">
              <button class="file-dl-btn" style="border:none; background:none; cursor:pointer; font-size:0.8rem; padding:2px;" title="Скачать оригинальный файл">💾</button>
              <button class="file-del-btn" style="border:none; background:none; cursor:pointer; font-size:0.8rem; padding:2px; color:#ef4444;" title="Удалить">🗑️</button>
            </div>
          `;

          item.querySelector('.file-dl-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            if (typeof window.JSZip === 'undefined') {
              alert("Ошибка: Библиотека JSZip не доступна для распаковки.");
              return;
            }

            try {
              const zip = new window.JSZip();
              const loadedZip = await zip.loadAsync(new Uint8Array(fileObj.payload));
              const zippedFile = loadedZip.file(cleanName);
              if (!zippedFile) {
                alert("Ошибка: Оригинальный файл не найден внутри упакованного контейнера.");
                return;
              }

              const originalBuffer = await zippedFile.async("arraybuffer");
              const blob = new Blob([originalBuffer], { type: fileObj.mimeType || "application/octet-stream" });
              const url = URL.createObjectURL(blob);

              const a = document.createElement('a');
              a.href = url;
              a.download = cleanName;
              a.click();
              URL.revokeObjectURL(url);
            } catch (err) {
              alert("Не удалось распаковать оригинальный файл.");
              console.error(err);
            }
          });

          item.querySelector('.file-del-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Удалить файл "${cleanName}" из списка?`)) {
              filesList = filesList.filter(f => f.id !== fileObj.id);
              onChange(filesList.length > 0 ? filesList : null);
              renderQueue();
            }
          });

          queueContainer.appendChild(item);
        });
      };

      renderQueue();

      addBtn.addEventListener('click', (e) => { e.stopPropagation(); filePicker.click(); });

      filePicker.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        addBtn.disabled = true;
        addBtn.textContent = 'Сжатие...';

        if (typeof window.JSZip === 'undefined') {
          alert("Критическая ошибка: Библиотека архивации JSZip не загружена!");
          addBtn.disabled = false;
          addBtn.textContent = '+ Добавить';
          return;
        }

        for (const file of files) {
          await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = async (evt) => {
              try {
                const originalBuffer = evt.target.result;
                const zip = new window.JSZip();

                zip.file(file.name, originalBuffer);

                const zippedUint8Array = await zip.generateAsync({
                  type: "uint8array",
                  compression: "DEFLATE",
                  compressionOptions: { level: 9 }
                });

                let sanitizedName = file.name.replace(/^\uFEFF/, '');

                filesList.push({
                  id: crypto.randomUUID(),
                  fileName: sanitizedName,
                  size: zippedUint8Array.length,
                  mimeType: file.type || "application/octet-stream",
                  payload: Array.from(zippedUint8Array)
                });
              } catch (zipErr) {
                console.error("Ошибка сжатия:", zipErr);
              }
              resolve();
            };
            reader.readAsArrayBuffer(file);
          });
        }

        onChange(filesList);
        filePicker.value = "";
        addBtn.disabled = false;
        addBtn.textContent = '+ Добавить';
        renderQueue();
      });

      return container;
    }
  },
  FINANCE: {
    renderView: (val) => {
      if (val === undefined || val === null || val === '') return '—';
      return Number(val).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    renderEdit: (val, onChange) => {
      const input = document.createElement('input');
      input.type = 'number';
      input.step = '0.01'; 
      input.style.cssText = 'width:100%; padding:4px; font-size:0.9rem; border-radius:4px; border:1px solid #ccc;';
      input.value = val !== undefined && val !== null ? Number(val).toFixed(2) : '';

      input.addEventListener('blur', () => {
        const num = input.value ? parseFloat(Number(input.value).toFixed(2)) : 0;
        onChange(num);
      });
      return input;
    }
  },

  QUANTITY: {
    renderView: (val) => {
      if (val === undefined || val === null || val === '') return '—';
      return Number(val).toLocaleString('ru-RU', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    },
    renderEdit: (val, onChange) => {
      const input = document.createElement('input');
      input.type = 'number';
      input.step = '0.001'; 
      input.style.cssText = 'width:100%; padding:4px; font-size:0.9rem; border-radius:4px; border:1px solid #ccc;';
      input.value = val !== undefined && val !== null ? Number(val).toFixed(3) : '';

      input.addEventListener('blur', () => {
        const num = input.value ? parseFloat(Number(input.value).toFixed(3)) : 0;
        onChange(num);
      });
      return input;
    }
  },
  RELATION: {
    renderView: (val, colName, currentEntity) => {
      if (!val) return '—';
      const targetDirectoryId = currentEntity.relationTargets?.[colName];
      if (!targetDirectoryId || !window.appInstance) return '—';

      const targetDir = window.appInstance.entities.find(e => e.id === targetDirectoryId);
      if (!targetDir || !targetDir.rows) return '[Справочник не найден]';

      const connectedRow = targetDir.rows.find(r => r.id === val);
      if (!connectedRow) return '[Элемент удален]';

      return connectedRow['Наименование'] || `[Без имени: ${connectedRow.id.slice(0, 6)}]`;
    },

    renderEdit: (val, onChange, colName, currentEntity, currentTabId, currentSourceRowId) => {
      const container = document.createElement('div');
      container.style.cssText = 'display:flex; gap:5px; align-items:center; width:100%;';
      container.addEventListener('click', (e) => e.stopPropagation());

      const targetDirectoryId = currentEntity.relationTargets?.[colName];

      const select = document.createElement('select');
      select.style.cssText = 'flex-grow:1; padding:4px; font-size:0.9rem; border-radius:4px; border:1px solid #ccc;';

      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = '-- Выберите элемент --';
      select.appendChild(defaultOpt);

      let targetDir = null;
      if (targetDirectoryId && window.appInstance) {
        targetDir = window.appInstance.entities.find(e => e.id === targetDirectoryId);
      }

      if (targetDir && targetDir.rows) {
        targetDir.rows.forEach(row => {
          const opt = document.createElement('option');
          opt.value = row.id;
          opt.textContent = row['Наименование'] || `[ID: ${row.id.slice(0, 6)}]`;
          if (row.id === val) opt.selected = true;
          select.appendChild(opt);
        });
      }

      select.addEventListener('change', () => {
        onChange(select.value || null);
      });

      container.appendChild(select);

      if (currentSourceRowId && targetDir) {
        const quickAddBtn = document.createElement('button');
        quickAddBtn.textContent = '➕';
        quickAddBtn.title = `Создать на лету`;
        quickAddBtn.style.cssText = 'padding:4px 8px; font-size:0.9rem; cursor:pointer; background:#e7f3ff; border:1px solid #b3d7ff; color:#0066cc; border-radius:4px; font-weight:bold;';

        quickAddBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!window.appInstance || !window.appInstance.tabsManager) return;

          window.appInstance.tabsManager.openTab({
            id: crypto.randomUUID(),
            entityId: targetDir.id,
            title: `Новый в "${targetDir.title}"`,
            type: 'directory',
            viewMode: 'form',
            targetRowId: null,
            callback: {
              sourceTabId: currentTabId,
              sourceRowId: currentSourceRowId,
              sourceColumn: colName
            }
          });
        });
        container.appendChild(quickAddBtn);
      }

      return container;
    }
  }

};