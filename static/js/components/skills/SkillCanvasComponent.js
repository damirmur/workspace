// static/js/components/skills/SkillCanvasComponent.js
import { BaseCanvasComponent } from '../BaseCanvasComponent.js';
import { SystemTools } from './SystemTools.js';
import { SkillExecutor } from './SkillExecutor.js';

export class SkillCanvasComponent extends BaseCanvasComponent {
  constructor(entity, onUpdate, onDelete) {
    super(entity, onUpdate, onDelete);
    
    // Инициализируем код по умолчанию, если робот только что создан
    if (!this.entity.script) {
      this.entity.script = `// Пример OpenAI-совместимого автономного робота\n` +
        `Workspace.log("Привет! Я проверяю доступные мне инструменты...");\n` +
        `const manifest = Workspace.getToolsManifest();\n` +
        `Workspace.log(manifest);\n\n` +
        `// Робот читает заметки и на основе данных создает новую автоматизацию\n` +
        `const notes = await Workspace.callTool("get_all_notes");\n` +
        `Workspace.log(\`Найдено заметок: \${notes.length}\`);\n`;
    }
  }

  render() {
    const wrapper = document.createElement('div');
    wrapper.className = 'skill-workspace';
    
    wrapper.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <h2 id="skill-title-text" style="margin:0; padding:4px;">🤖 Робот-скилл: ${this.entity.title}</h2>
        <div style="display:flex; gap:10px;">
          <button id="run-skill-btn" style="padding: 8px 16px; background:#28a745; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">▶️ Запустить</button>
          <button id="skill-delete-btn" style="padding: 8px 12px; background:#dc3545; color:white; border:none; border-radius:4px; cursor:pointer;">Удалить</button>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-top:15px; height: calc(100vh - 160px);">
        <!-- Левое поле: Редактор JavaScript сценария -->
        <div style="display:flex; flex-direction:column;">
          <label style="font-weight:bold; margin-bottom:5px; color:#555;">Сценарий автоматизации (JavaScript):</label>
          <textarea id="skill-code-editor" style="flex-grow:1; font-family:monospace; padding:10px; background:#1e1e1e; color:#d4d4d4; border-radius:4px; border:none; resize:none; font-size:0.95rem; line-height:1.4;">${this.entity.script}</textarea>
        </div>

        <!-- Правое поле: Консоль вывода (Терминал логов) -->
        <div style="display:flex; flex-direction:column;">
          <label style="font-weight:bold; margin-bottom:5px; color:#555;">Консоль выполнения (Logs):</label>
          <div id="skill-terminal" style="flex-grow:1; background:#000; color:#00ff00; font-family:monospace; padding:10px; border-radius:4px; overflow-y:auto; font-size:0.9rem; white-space:pre-wrap;">Ожидание запуска...</div>
        </div>
      </div>
    `;

    const titleHeader = wrapper.querySelector('#skill-title-text');
    const codeEditor = wrapper.querySelector('#skill-code-editor');
    const terminal = wrapper.querySelector('#skill-terminal');
    const runBtn = wrapper.querySelector('#run-skill-btn');

    // 1. Инлайновое изменение названия робота
    if (titleHeader) {
      this.makeEditable(titleHeader, (newTitle) => {
        this.entity.title = newTitle.replace(/^🤖 Робот-скилл:\s*/, '');
        this.onUpdate(this.entity);
      });
    }

    // 2. Автосохранение кода при вводе
    codeEditor.addEventListener('input', () => {
      this.entity.script = codeEditor.value;
      this.onUpdate(this.entity); // Улетает в БД через Debounce
    });

    // 3. Запуск Роботизированного сценария
    runBtn.addEventListener('click', async () => {
      terminal.textContent = ''; // Очищаем старые логи
      
      // Передаем контекст окна верхнего уровня window.appInstance
      const tools = new SystemTools(window.appInstance);
      const executor = new SkillExecutor(tools);
      
      runBtn.disabled = true;
      runBtn.style.opacity = '0.5';

      await executor.run(codeEditor.value, (logChunk) => {
        terminal.textContent += logChunk;
        terminal.scrollTop = terminal.scrollHeight; // Скролл терминала вниз
      });

      runBtn.disabled = false;
      runBtn.style.opacity = '1';
    });

    wrapper.querySelector('#skill-delete-btn').addEventListener('click', () => {
      if (confirm(`Удалить робота "${this.entity.title}"?`)) this.onDelete(this.entity.id);
    });

    return wrapper;
  }
}
