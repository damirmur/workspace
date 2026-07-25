// static/js/tabs/TabsManager.js

export class TabsManager {
  constructor(appContext, tabBarContainer, canvasContainer) {
    this.app = appContext;       // Ссылка на главный WorkspaceApp
    this.tabBar = tabBarContainer; // DOM-элемент #tabs-bar
    this.canvas = canvasContainer; // DOM-элемент #workspace-canvas
    
    this.tabs = [];        // Массив активных объектов вкладок (Tab)
    this.activeTabId = null; // ID текущей выбранной вкладки
  }

  /**
   * Открыть новую или переключиться на существующую вкладку
   * @param {Object} tabConfig - Конфигурация открываемой вкладки
   */
  openTab(tabConfig) {
    // ЗАЩИТА: Если мы открываем табличный вид сущности, проверяем, не открыта ли она уже
    if (tabConfig.viewMode === 'table') {
      const existingTab = this.tabs.find(t => t.entityId === tabConfig.entityId && t.viewMode === 'table');
      if (existingTab) {
        this.selectTab(existingTab.id);
        return;
      }
    }

    // Если открываем форму конкретного элемента на редактирование, проверяем её дубликат
    if (tabConfig.viewMode === 'form' && tabConfig.targetRowId) {
      const existingFormTab = this.tabs.find(t => t.entityId === tabConfig.entityId && t.targetRowId === tabConfig.targetRowId);
      if (existingFormTab) {
        this.selectTab(existingFormTab.id);
        return;
      }
    }

    // Сборка объекта новой вкладки
    const newTab = {
      id: crypto.randomUUID(),
      viewMode: 'table',
      targetRowId: null,
      callback: null,
      ...tabConfig
    };

    this.tabs.push(newTab);
    this.selectTab(newTab.id);
  }

  /**
   * Сделать вкладку активной и смонтировать её UI-компонент на холст
   * @param {string} tabId 
   */
  selectTab(tabId) {
    this.activeTabId = tabId;
    const currentTab = this.tabs.find(t => t.id === tabId);
    
    if (currentTab) {
      // Синхронизируем состояние приложения с сущностью текущей вкладки
      this.app.selectedEntity = this.app.entities.find(e => e.id === currentTab.entityId);
    } else {
      this.app.selectedEntity = null;
    }

    // Обновляем подсветку активного элемента в левом сайдбаре
    if (typeof this.app.syncSidebarActiveState === 'function') {
      this.app.syncSidebarActiveState();
    }

    this.renderTabBar();
    this.renderCanvasContent();
  }

  /**
   * Закрыть вкладку и защитить систему от "зависших" callback-сессий
   * @param {string} tabId 
   * @param {Event} [e] - Объект события клика мышью
   */
  closeTab(tabId, e) {
    if (e) e.stopPropagation(); // Исключаем всплытие клика на активацию вкладки

    const index = this.tabs.findIndex(t => t.id === tabId);
    if (index === -1) return;

    const closedTab = this.tabs[index];
    this.tabs.splice(index, 1);

    // ЗАЩИТА ОТ КАСКАДНЫХ СИРОТ:
    // Если закрывается вкладка-родитель, которая ожидала возврат данных "на лету" от дочерних форм,
    // мы должны найти эти дочерние вкладки и стереть у них флаг callback, превратив их в обычные формы.
    this.tabs.forEach(t => {
      if (t.callback && t.callback.sourceTabId === closedTab.id) {
        console.warn(`Вкладка-родитель ${closedTab.id} закрыта. Callback для вкладки ${t.id} аннулирован.`);
        t.callback = null;
        // Если эта дочерняя вкладка сейчас открыта на экране — перерисовываем её кнопки
        if (this.activeTabId === t.id) this.renderCanvasContent();
      }
    });

    // Управление фокусом после удаления активной вкладки
    if (this.activeTabId === tabId) {
      if (this.tabs.length > 0) {
        // Переключаемся на ближайшую левую вкладку
        const nextActiveIndex = Math.max(0, index - 1);
        this.selectTab(this.tabs[nextActiveIndex].id);
      } else {
        this.activeTabId = null;
        this.app.selectedEntity = null;
        if (typeof this.app.syncSidebarActiveState === 'function') this.app.syncSidebarActiveState();
        this.renderTabBar();
        this.canvas.innerHTML = '<div id="empty-state">Выберите сущность в левом сайдбаре, чтобы открыть вкладку</div>';
      }
    } else {
      this.renderTabBar();
    }
  }

  /**
   * Отрисовка верхней горизонтальной панели плашек вкладок
   */
  renderTabBar() {
    this.tabBar.innerHTML = '';
    if (this.tabs.length === 0) return;

    const ul = document.createElement('ul');
    ul.style.cssText = 'display:flex; list-style:none; padding:0; margin:0; overflow-x:auto; height:100%; align-items:flex-end;';

    this.tabs.forEach(tab => {
      const li = document.createElement('li');
      const isActive = tab.id === this.activeTabId;
      
      li.style.cssText = `
        padding: 6px 14px; 
        cursor: pointer; 
        display: flex; 
        align-items: center; 
        gap: 10px;
        background: ${isActive ? '#fff' : '#cbd5e1'};
        border-right: 1px solid #94a3b8;
        border-top: 3px solid ${isActive ? '#007bff' : 'transparent'};
        border-radius: 4px 4px 0 0;
        font-size: 0.85rem;
        color: ${isActive ? '#0f172a' : '#475569'};
        font-weight: ${isActive ? '600' : 'normal'};
        transition: all 0.15s ease;
        margin-right: 2px;
        height: 24px;
      `;

      li.innerHTML = `
        <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:140px;">${tab.title}</span>
        <span class="close-tab-btn-x" style="font-size:0.75rem; color:#94a3b8; font-weight:bold; padding:2px 4px; border-radius:50%; transition:background 0.2s;">✕</span>
      `;

      // Стили эффекта наведения на крестик закрытия
      const xBtn = li.querySelector('.close-tab-btn-x');
      xBtn.addEventListener('mouseenter', () => { xBtn.style.background = '#ef4444'; xBtn.style.color = '#fff'; });
      xBtn.addEventListener('mouseleave', () => { xBtn.style.background = 'transparent'; xBtn.style.color = '#94a3b8'; });

      li.addEventListener('click', () => this.selectTab(tab.id));
      xBtn.addEventListener('click', (evt) => this.closeTab(tab.id, evt));
      
      ul.appendChild(li);
    });

    this.tabBar.appendChild(ul);
  }

  /**
   * Запрос сборки интерфейса у Фабрики на основе полиморфного стейта вкладки
   */
  renderCanvasContent() {
    const currentTab = this.tabs.find(t => t.id === this.activeTabId);
    if (!currentTab || !this.app.selectedEntity) return;

    this.canvas.innerHTML = '';

    // Вызываем фабрику CanvasUIFactory и передаем текущую сущность И объект вкладки.
    // Объект вкладки укажет компоненту, рендерить ли таблицу или форму элемента.
    const component = this.app.canvasFactory.create(
      this.app.selectedEntity,
      currentTab, 
      (ent) => this.app.updateEntity(ent),
      (id) => this.app.deleteEntity(id)
    );

    this.canvas.appendChild(component.render());
  }
}
