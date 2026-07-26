// static/js/components/directory/table/DirectoryTableSearch.js

export class DirectoryTableSearch {
  constructor(canvasContext) {
    this.ctx = canvasContext;
  }

  /**
   * Сверхбыстрая фильтрация строк на основе контекста Master-Detail
   */
  getFilteredRows() {
    let rows = this.ctx.entity.rows || [];

    if (this.ctx.tab.ownerContext) {
      const { directoryId, rowId, relationType } = this.ctx.tab.ownerContext;

      rows = rows.filter(r => {
        if (!r._ownerContext) return false;

        if (relationType === 'MANY_TO_MANY' && Array.isArray(r._ownerContext)) {
          return r._ownerContext.some(ctx => 
            String(ctx.directoryId) === String(directoryId) && String(ctx.rowId) === String(rowId)
          );
        } else if (relationType === 'ONE_TO_MANY' && !Array.isArray(r._ownerContext)) {
          return String(r._ownerContext.directoryId) === String(directoryId) && 
                 String(r._ownerContext.rowId) === String(rowId);
        }
        return false;
      });
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
      this.ctx.rowsComponent.render(tableBodyElement, this.getFilteredRows());
    });
  }
}
