// static/js/components/skills/SystemTools.js

export class SystemTools {
  constructor(appContext) {
    this.app = appContext; // Ссылка на главный экземпляр WorkspaceApp
  }

  // Манифест инструментов по спецификации OpenAI Function Calling
  getManifest() {
    return [
      {
        type: "function",
        function: {
          name: "get_all_notes",
          description: "Возвращает список всех текстовых заметок в текущем пространстве."
        }
      },
      {
        type: "function",
        function: {
          name: "create_new_note",
          description: "Создает новую текстовую заметку с указанным заголовком и текстом.",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "Заголовок заметки" },
              content: { type: "string", description: "Содержимое заметки" }
            },
            required: ["title", "content"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "find_directory_rows",
          description: "Ищет строки в конкретном Справочнике по его названию.",
          parameters: {
            type: "object",
            properties: {
              directoryTitle: { type: "string", description: "Точное название справочника" },
              searchQuery: { type: "string", description: "Поисковый запрос для фильтрации строк" }
            },
            required: ["directoryTitle"]
          }
        }
      },
      // === НОВЫЕ ИНСТРУМЕНТЫ ДЛЯ РАБОТЫ С ПРОЕКТАМИ ===
      {
        type: "function",
        function: {
          name: "get_project_tasks",
          description: "Возвращает все задачи и подзадачи конкретного Проекта по его названию.",
          parameters: {
            type: "object",
            properties: {
              projectTitle: { type: "string", description: "Точное или частичное название проекта" }
            },
            required: ["projectTitle"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "add_task_to_project",
          description: "Добавляет новую задачу или вложенную подзадачу в дерево проекта.",
          parameters: {
            type: "object",
            properties: {
              projectTitle: { type: "string", description: "Название проекта" },
              taskTitle: { type: "string", description: "Текст создаваемой задачи" },
              parentId: { type: "string", description: "Опциональный UUID родительской задачи. Если не указан, создается корневая задача." }
            },
            required: ["projectTitle", "taskTitle"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_task_status",
          description: "Изменяет статус выполнения конкретной задачи (done: true/false) по её UUID.",
          parameters: {
            type: "object",
            properties: {
              projectTitle: { type: "string", description: "Название проекта, в котором находится задача" },
              taskId: { type: "string", description: "Уникальный UUID задачи" },
              done: { type: "boolean", description: "Новый статус выполнения задачи (true - выполнено, false - не выполнено)" }
            },
            required: ["projectTitle", "taskId", "done"]
          }
        }
      }
    ];
  }

  // Реализация вызовов функций (Исполняемая среда OpenAI Function Calling)
  async execute(functionName, args = {}) {
    console.log(`🤖 Робот вызывает инструмент [${functionName}]:`, args);

    switch (functionName) {
      case "get_all_notes": {
        return this.app.entities
          .filter(e => e.type === "note")
          .map(e => ({ id: e.id, title: e.title, content: e.content }));
      }

      case "create_new_note": {
        await this.app.createNewEntity("note", { title: args.title, content: args.content });
        return { status: "success", message: `Заметка '${args.title}' создана.` };
      }

      case "find_directory_rows": {
        const dir = this.app.entities.find(e => e.type === "directory" && e.title.toLowerCase() === args.directoryTitle.toLowerCase());
        if (!dir) return { error: `Справочник '${args.directoryTitle}' не найден.` };
        const query = args.searchQuery ? args.searchQuery.toLowerCase() : "";
        const matched = dir.rows.filter(row => Object.values(row).some(v => String(v).toLowerCase().includes(query)));
        return { directory: dir.title, matchedRows: matched };
      }

      // === РЕАЛИЗАЦИЯ ПОЛУЧЕНИЯ ЗАДАЧ ПРОЕКТА ===
      case "get_project_tasks": {
        const project = this.findProject(args.projectTitle);
        if (!project) return { error: `Проект '${args.projectTitle}' не найден.` };
        return { projectId: project.id, projectTitle: project.title, tasks: project.tasks || [] };
      }

      // === РЕАЛИЗАЦИЯ ДОБАВЛЕНИЯ ЗАДАЧИ/ПОДЗАДАЧИ ===
      case "add_task_to_project": {
        const project = this.findProject(args.projectTitle);
        if (!project) return { error: `Проект '${args.projectTitle}' не найден.` };
        if (!project.tasks) project.tasks = [];

        const newTask = {
          id: crypto.randomUUID(),
          title: args.taskTitle,
          done: false,
          subtasks: []
        };

        if (!args.parentId) {
          // Создаем корневую задачу
          project.tasks.push(newTask);
          await this.saveProjectState(project);
          return { status: "success", type: "root_task", task: newTask };
        } else {
          // Ищем родительскую задачу рекурсивно и добавляем в неё
          const parentFound = this.recursiveAddSubtask(project.tasks, args.parentId, newTask);
          if (parentFound) {
            await this.saveProjectState(project);
            return { status: "success", type: "subtask", parentId: args.parentId, task: newTask };
          }
          return { error: `Родительская задача с ID '${args.parentId}' не найдена в проекте.` };
        }
      }

      // === РЕАЛИЗАЦИЯ ОБНОВЛЕНИЯ СТАТУСА ЗАДАЧИ ===
      case "update_task_status": {
        const project = this.findProject(args.projectTitle);
        if (!project) return { error: `Проект '${args.projectTitle}' не найден.` };
        if (!project.tasks) return { error: "В проекте нет задач." };

        const statusUpdated = this.recursiveUpdateStatus(project.tasks, args.taskId, args.done);
        if (statusUpdated) {
          await this.saveProjectState(project);
          return { status: "success", message: `Статус задачи ${args.taskId} изменен на ${args.done}.` };
        }
        return { error: `Задача с ID '${args.taskId}' не найдена в этом проекте.` };
      }

      default:
        throw new Error(`Инструмент '${functionName}' не поддерживается системой.`);
    }
  }

  // === ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ КЛАССА ===

  // Поиск проекта в памяти по имени
  findProject(titleQuery) {
    return this.app.entities.find(e => 
      e.type === "project" && e.title.toLowerCase().includes(titleQuery.toLowerCase())
    );
  }

  // Рекурсивный поиск родителя и добавление подзадачи
  recursiveAddSubtask(tasksArray, parentId, newTask) {
    for (let task of tasksArray) {
      if (task.id === parentId) {
        if (!task.subtasks) task.subtasks = [];
        task.subtasks.push(newTask);
        return true;
      }
      if (task.subtasks && task.subtasks.length > 0) {
        const foundInside = this.recursiveAddSubtask(task.subtasks, parentId, newTask);
        if (foundInside) return true;
      }
    }
    return false;
  }

  // Рекурсивный поиск задачи по ID для изменения чекбокса
  recursiveUpdateStatus(tasksArray, taskId, doneStatus) {
    for (let task of tasksArray) {
      if (task.id === taskId) {
        task.done = doneStatus;
        return true;
      }
      if (task.subtasks && task.subtasks.length > 0) {
        const updatedInside = this.recursiveUpdateStatus(task.subtasks, taskId, doneStatus);
        if (updatedInside) return true;
      }
    }
    return false;
  }

  // Сохранение обновленного состояния проекта в базу данных и обновление UI
  async saveProjectState(projectEntity) {
    // Вызываем главный метод обновления сущностей приложения (он сохранит в IndexedDB и запустит Debounce на Go сервер)
    await this.app.updateEntity(projectEntity);

    // Если этот проект прямо сейчас открыт на экране у пользователя, принудительно перерисовываем холст, чтобы чекбоксы и новые задачи появились мгновенно
    if (this.app.selectedEntity && this.app.selectedEntity.id === projectEntity.id) {
      this.app.selectEntity(projectEntity);
    }
  }
}

