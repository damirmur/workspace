// static/js/components/directory/table/DirectoryCanvasComponent.js
import { BaseCanvasComponent } from '../../BaseCanvasComponent.js';
import { DirectoryHeaderComponent } from '../DirectoryHeaderComponent.js';
import { DirectoryRowsComponent } from '../DirectoryRowsComponent.js';
import { DirectoryExchangeService } from '../DirectoryExchangeService.js';
import { DirectoryRelationsModal } from './DirectoryRelationsModal.js';
import { DirectoryTableToolbar } from './DirectoryTableToolbar.js'; // ИМПОРТ
import { DirectoryTableSearch } from './DirectoryTableSearch.js';   // ИМПОРТ

export class DirectoryCanvasComponent extends BaseCanvasComponent {
  constructor(entity, tabContext, onUpdate, onDelete) {
    super(entity, onUpdate, onDelete);
    this.tab = tabContext; 
    this.app = window.appInstance; 

    // Инициализируем дефолтную структуру метамодели данных
    if (!this.entity.columns) this.entity.columns = ['Название', 'Описание'];
    if (!this.entity.columnTypes) {
      this.entity.columnTypes = {};
      this.entity.columns.forEach(col => { this.entity.columnTypes[col] = 'TEXT'; });
    }
    if (!this.entity.rows) this.entity.rows = [];
    if (!this.entity.relationTargets) this.entity.relationTargets = {};
    if (!this.entity.allowedSubDirectories) this.entity.allowedSubDirectories = [];

    this.searchQuery = '';
    this.viewType = this.tab.viewType || 'table'; 
    if (!this.tab.expandedNodes) this.tab.expandedNodes = new Set();

    // Сборка сервис-сателлитов по паттерну Композиция (Composition over Inheritance)
    this.headerComponent = new DirectoryHeaderComponent(this);
    this.rowsComponent = new DirectoryRowsComponent(this);
    this.exchangeService = new DirectoryExchangeService(this);
    this.relationsModal = new DirectoryRelationsModal(this);
    this.toolbarComponent = new DirectoryTableToolbar(this);
    this.searchComponent = new DirectoryTableSearch(this);
  }

  render() {
    const wrapper = document.createElement('div');
    wrapper.className = 'directory-workspace';
    wrapper.style.cssText = 'display:flex; flex-direction:column; height:100%; box-sizing:border-box;';
    const isSubTable = !!this.tab.ownerContext;

    wrapper.innerHTML = `
      <div id="dir-toolbar-injector" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap:wrap; gap:10px; flex-shrink:0;"></div>
      <div id="dir-search-injector" class="search-panel" style="margin-bottom: 12px; flex-shrink:0;"></div>
      <div class="table-scroll-container" style="overflow-x:auto; flex-grow:1; border:1px solid #e2e8f0; border-radius:4px; max-height:${isSubTable ? '250px' : 'none'};">
        <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
          <thead><tr id="table-head-row"></tr></thead>
          <tbody id="table-body"></tbody>
        </table>
      </div>
    `;

    const tableBody = wrapper.querySelector('#table-body');

    // Делегируем прорисовку изолированным модулям
    this.toolbarComponent.render(wrapper.querySelector('#dir-toolbar-injector'));
    this.searchComponent.render(wrapper.querySelector('#dir-search-injector'), tableBody);
    this.headerComponent.render(wrapper.querySelector('#table-head-row'));
    
    // Выводим отфильтрованные строки через сателлит поиска
    this.rowsComponent.render(tableBody, this.searchComponent.getFilteredRows());

    return wrapper;
  }

  saveAndRefresh() {
    this.onUpdate(this.entity);
    if (this.app && this.app.tabsManager) this.app.tabsManager.renderCanvasContent();
  }
}
