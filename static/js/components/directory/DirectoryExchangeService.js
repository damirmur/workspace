// static/js/components/directory/DirectoryExchangeService.js

export class DirectoryExchangeService {
    constructor(componentContext) {
        this.ctx = componentContext; // Ссылка на главный DirectoryCanvasComponent
    }

    /**
     * Сборка и скачивание слепка справочника в формате JSON
     */
    exportToJSON() {
        // Формируем стандартизированный манифест бэкапа
        const backupData = {
            fileType: "workspace_directory_backup",
            version: 1,
            exportedAt: Date.now(),
            payload: {
                title: this.ctx.entity.title,
                columns: this.ctx.entity.columns,
                columnTypes: this.ctx.entity.columnTypes || {},
                relationTargets: this.ctx.entity.relationTargets || {},
                rows: this.ctx.entity.rows || []
            }
        };

        try {
            // КЛЮЧЕВОЙ АЛГОРИТМ ОПТИМИЗАЦИИ:
            // Используем функцию-replacer для компактного сжатия массивов байт в одну строку
            const jsonString = JSON.stringify(backupData, (key, value) => {
                if (key === 'payload' && Array.isArray(value)) {
                    // Сжимает массив байт любого файла в инлайновую горизонтальную строчку
                    return `__INLINE_ARRAY__:${JSON.stringify(value)}`;
                }
                return value;
            }, 2)
                .replace(/"__INLINE_ARRAY__:(.*?)"/g, (match, p1) => {
                    return p1.replace(/\\"/g, '"');
                });

            // Превращаем оптимизированный текст в скачиваемый Blob-объект
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);

            // Программная генерация клика для скачивания файла
            const a = document.createElement("a");
            const cleanTitle = this.ctx.entity.title.replace(/[^a-zA-Z0-9а-яА-Я_-]/g, "_");
            a.href = url;
            a.download = `directory_backup_${cleanTitle}.json`;
            a.click();

            // Освобождаем операционную память браузера
            URL.revokeObjectURL(url);
            console.log(`Справочник "${this.ctx.entity.title}" успешно экспортирован с оптимизацией ZIP-полей.`);
        } catch (err) {
            alert("Ошибка при формировании JSON файла экспорта.");
            console.error(err);
        }
    }

    /**
     * Обработка загруженного файла и валидация структуры
     * @param {File} file - Объект файла из инпута
     */
    importFromJSON(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedData = JSON.parse(e.target.result);

                // ВАЛИДАЦИЯ: Проверяем, что файл создан нашей системой
                if (importedData.fileType !== "workspace_directory_backup") {
                    alert("Критическая ошибка: Выбранный файл не является валидным бэкапом Справочника Workspace!");
                    return;
                }

                const data = importedData.payload;
                if (!data || !Array.isArray(data.columns) || !Array.isArray(data.rows)) {
                    alert("Ошибка: Нарушена внутренняя структура данных внутри JSON-файла.");
                    return;
                }

                // Запрашиваем у пользователя сценарий наката данных
                const mode = prompt(
                    `Обнаружен бэкап справочника "${data.title}" (${data.rows.length} строк).\n\n` +
                    `Выберите режим импорта:\n` +
                    `1 - Перезаписать таблицу (Текущие строки удалятся)\n` +
                    `2 - Дописать/Объединить (Сохранить текущие, добавить новые)`
                );

                if (mode === "1") {
                    this.executeReplace(data);
                } else if (mode === "2") {
                    this.executeMerge(data);
                } else {
                    alert("Импорт отменен.");
                }

            } catch (err) {
                alert("Ошибка парсинга JSON. Файл поврежден или имеет неверную кодировку.");
                console.error(err);
            }
        };

        reader.readAsText(file);
    }

    /**
     * Сценарий А: Полная замена структуры и данных
     */
    async executeReplace(data) {
        if (!confirm("Внимание! Текущие строки этого справочника будут полностью удалены. Продолжить?")) return;

        this.ctx.entity.columns = data.columns;
        this.ctx.entity.columnTypes = data.columnTypes || {};
        this.ctx.entity.relationTargets = data.relationTargets || {};
        this.ctx.entity.rows = data.rows;

        this.ctx.saveAndRefresh();
        alert("Справочник успешно перезаписан из бэкапа!");
    }

    /**
     * Сценарий Б: Слияние без дублирования UUID
     */
    async executeMerge(data) {
        // Валидируем совместимость колонок перед слиянием
        const currentColsSignature = [...this.ctx.entity.columns].sort().join(",");
        const importedColsSignature = [...data.columns].sort().join(",");

        if (currentColsSignature !== importedColsSignature) {
            alert("Критическая ошибка слияния: Структура колонок текущего справочника не совпадает со структурой в файле бэкапа. Используйте режим Перезаписи (1).");
            return;
        }

        let addedCount = 0;
        let skippedCount = 0;

        data.rows.forEach(importedRow => {
            // Гарантируем наличие UUID у импортируемой строки
            if (!importedRow.id) importedRow.id = crypto.randomUUID();

            // Проверяем, нет ли уже в нашей базе строки с таким же UUID
            const exists = this.ctx.entity.rows.some(r => r.id === importedRow.id);

            if (!exists) {
                this.ctx.entity.rows.push(importedRow);
                addedCount++;
            } else {
                skippedCount++;
            }
        });

        this.ctx.saveAndRefresh();
        alert(`Слияние завершено!\nДобавлено новых строк: ${addedCount}\nПропущено дубликатов: ${skippedCount}`);
    }
}
