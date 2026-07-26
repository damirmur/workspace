// static/js/components/directory/table/DirectoryTableSearch.js

export class DirectoryTableSearch {
  constructor(canvasContext) {
    this.ctx = canvasContext;
  }

  /**
   * Логика фильтрации и Join-обхода строк в памяти
   */
  getFilteredRows() {
    let rows = this.ctx.entity.rows || [];

    // Фильтр Master-Detail связи, если мы внутри карточки элемента
    if (this.ctx.tab.ownerContext) {
      rows = rows.filter(r => 
        r._ownerContext &&
        r._ownerContext.directoryId === this.ctx.tab.ownerContext.directoryId &&
        r._ownerContext.rowId === this.ctx.tab.ownerContext.rowId
      );
    }

    const query = this.ctx.searchQuery.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter(row => {
      return this.ctx.entity.columns.some(colName => {
        const cellValue = row[colName];
        if (!cellValue) return false;
        
        return String(cellValue).toLowerCase().includes(query);
      });
    });
  }

  render(containerElement, tableBodyElement) {
    containerElement.innerHTML = `
      <input type="text" id="dir-search-input" placeholder="Поиск по ячейкам..." value="${this.ctx.searchQuery}" 
             style="width:100%; padding:8px; font-size:0.9rem; border:1px solid #cbd5e1; border-radius:4px; box-sizing:border-box;">
    `;

    containerElement.querySelector('#dir-search-input').addEventListener('input', (e) => {
      this.ctx.searchQuery = e.target.value;
      // Мгновенно обновляем только строки в tbody без перерисовки инпута (сохраняем фокус клавиатуры!)
      this.ctx.rowsComponent.render(tableBodyElement, this.getFilteredRows());
    });
  }
}
