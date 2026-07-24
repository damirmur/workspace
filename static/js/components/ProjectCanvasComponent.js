import { BaseCanvasComponent } from './BaseCanvasComponent.js';

export class ProjectCanvasComponent extends BaseCanvasComponent {
  constructor(entity, onUpdate, onDelete) {
    super(entity, onUpdate, onDelete);
    if (!this.entity.tasks) this.entity.tasks = [];
  }

  render() {
    const wrapper = document.createElement('div');
    wrapper.className = 'project-workspace';
    wrapper.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h2 id="project-title-text" style="margin:0; padding:4px; border-radius:4px;">📁 Проект: ${this.entity.title}</h2>
        <div style="display:flex; gap:10px;">
          <button id="add-root-task-btn" style="padding: 8px 16px; background:#007bff; color:white; border:none; border-radius:4px; cursor:pointer;">
            + Корневая задача
          </button>
          <button id="project-delete-btn" style="padding: 8px 16px; background:#dc3545; color:white; border:none; border-radius:4px; cursor:pointer;">
            Удалить проект
          </button>
        </div>
      </div>
      <div id="tasks-tree-container" style="padding-left: 10px;"></div>
    `;

    const projectTitle = wrapper.querySelector('#project-title-text');
    const treeContainer = wrapper.querySelector('#tasks-tree-container');
    const addRootBtn = wrapper.querySelector('#add-root-task-btn');
    const deleteBtn = wrapper.querySelector('#project-delete-btn');

    // Клик по названию проекта для изменения имени
    if (projectTitle) {
      this.makeEditable(projectTitle, (newTitle) => {
        // Убираем префикс "📁 Проект: " если пользователь кликнул
        const cleanTitle = newTitle.replace(/^📁 Проект:\s*/, '');
        this.entity.title = cleanTitle;
        this.onUpdate(this.entity);
      });
    }

    if (treeContainer) {
      this.renderTree(this.entity.tasks, treeContainer);
    }

    if (addRootBtn) {
      addRootBtn.addEventListener('click', () => {
        const taskName = prompt('Введите название задачи:');
        if (taskName) this.addTask(this.entity.tasks, taskName);
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        if (confirm(`Вы уверены, что хотите удалить проект "${this.entity.title}"?`)) {
          this.onDelete(this.entity.id);
        }
      });
    }

    return wrapper;
  }

  renderTree(tasksList, container) {
    container.innerHTML = '';
    if (tasksList.length === 0) {
      container.innerHTML = '<p style="color:#888; font-style:italic;">Задач пока нет. Создайте первую!</p>';
      return;
    }

    const ul = document.createElement('ul');
    ul.style.listStyleType = 'none';
    ul.style.paddingLeft = '20px';
    ul.style.margin = '0';

    tasksList.forEach((task, index) => {
      const li = document.createElement('li');
      li.style.marginBottom = '8px';
      li.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px; background:#f8f9fa; padding:6px 10px; border-radius:4px; border-left: 3px solid #007bff;">
          <input type="checkbox" ${task.done ? 'checked' : ''} class="task-checkbox">
          <span class="task-title-text" style="${task.done ? 'text-decoration: line-through; color: #888;' : ''}; padding: 2px 4px; border-radius: 3px;">${task.title}</span>
          <div style="margin-left:auto; display:flex; gap:5px;">
            <button class="add-subtask-btn" style="padding:2px 6px; font-size:0.8rem; cursor:pointer;">+ подзадача</button>
            <button class="delete-task-btn" style="padding:2px 6px; font-size:0.8rem; background:#dc3545; color:white; border:none; cursor:pointer;">✕</button>
          </div>
        </div>
        <div class="subtasks-container"></div>
      `;

      const checkbox = li.querySelector('.task-checkbox');
      const taskTitleSpan = li.querySelector('.task-title-text');
      const addSubtaskBtn = li.querySelector('.add-subtask-btn');
      const deleteTaskBtn = li.querySelector('.delete-task-btn');
      const subtasksContainer = li.querySelector('.subtasks-container');

      // Клик по тексту задачи/подзадачи для переименования
      if (taskTitleSpan) {
        this.makeEditable(taskTitleSpan, (newTitle) => {
          task.title = newTitle;
          this.saveAndRefresh();
        });
      }

      if (checkbox) {
        checkbox.addEventListener('change', (e) => {
          task.done = e.target.checked;
          this.saveAndRefresh();
        });
      }

      if (addSubtaskBtn) {
        addSubtaskBtn.addEventListener('click', () => {
          const subtaskName = prompt(`Добавить подзадачу для "${task.title}":`);
          if (subtaskName) {
            if (!task.subtasks) task.subtasks = [];
            this.addTask(task.subtasks, subtaskName);
          }
        });
      }

      if (deleteTaskBtn) {
        deleteTaskBtn.addEventListener('click', () => {
          if (confirm(`Удалить задачу "${task.title}" и все её подзадачи?`)) {
            tasksList.splice(index, 1);
            this.saveAndRefresh();
          }
        });
      }

      if (task.subtasks && task.subtasks.length > 0 && subtasksContainer) {
        this.renderTree(task.subtasks, subtasksContainer);
      }
      ul.appendChild(li);
    });
    container.appendChild(ul);
  }

  addTask(targetList, title) {
    targetList.push({ id: crypto.randomUUID(), title, done: false, subtasks: [] });
    this.saveAndRefresh();
  }

  saveAndRefresh() {
    this.onUpdate(this.entity);
    const canvas = document.getElementById('workspace-canvas');
    if (canvas) {
      canvas.innerHTML = '';
      canvas.appendChild(this.render());
    }
  }
}