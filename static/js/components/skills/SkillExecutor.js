// static/js/components/skills/SkillExecutor.js

export class SkillExecutor {
  constructor(systemTools) {
    this.tools = systemTools;
  }

  // Запуск асинхронного JS-кода робота в изолированном контексте
  async run(scriptText, logCallback) {
    logCallback("▶️ Запуск робота-скилла...\n");

    // Создаем защищенный мост управления внутри песочницы
    const sandboxAPI = {
      log: (msg) => logCallback(`💬 [Робот]: ${typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg}\n`),
      getToolsManifest: () => this.tools.getManifest(),
      callTool: async (name, args) => {
        logCallback(`⚙️ Вызов инструмента '${name}'...\n`);
        try {
          const result = await this.tools.execute(name, args);
          logCallback(`✅ Результат '${name}' получен.\n`);
          return result;
        } catch (err) {
          logCallback(`❌ Ошибка инструмента '${name}': ${err.message}\n`);
          throw err;
        }
      }
    };

    try {
      // Конструируем функцию, передавая sandboxAPI в качестве аргумента контекста
      const runner = new Function('Workspace', `
        return (async () => {
          ${scriptText}
        })();
      `);

      // Запускаем скрипт, передавая наш контролируемый объект Workspace
      await runner(sandboxAPI);
      logCallback("\n🏁 Исполнение робота успешно завершено.");
    } catch (error) {
      logCallback(`\n🚨 Критический сбой скрипта: ${error.message}`);
      console.error(error);
    }
  }
}
