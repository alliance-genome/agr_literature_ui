/**
 * Copy handler for ag-grid containers that formats selected cells as
 * tab-separated rows instead of one-cell-per-line.
 *
 * Usage: <div className="ag-theme-quartz" onCopy={handleGridCopy}>
 */
export const handleGridCopy = (e) => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const container = e.currentTarget;
  const range = selection.getRangeAt(0);
  const cells = container.querySelectorAll('.ag-cell');
  const rowMap = new Map();

  for (const cell of cells) {
    if (!range.intersectsNode(cell)) continue;
    const row = cell.closest('.ag-row');
    if (!row) continue;
    const rowIndex = row.getAttribute('row-index');
    if (!rowMap.has(rowIndex)) rowMap.set(rowIndex, []);
    rowMap.get(rowIndex).push({
      colIndex: parseInt(cell.getAttribute('aria-colindex') || '0', 10),
      text: cell.textContent.trim()
    });
  }

  if (rowMap.size === 0) return;

  const tsv = [...rowMap.entries()]
    .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
    .map(([, rowCells]) =>
      rowCells.sort((a, b) => a.colIndex - b.colIndex).map(c => c.text).join('\t')
    )
    .join('\n');

  e.clipboardData.setData('text/plain', tsv);
  e.preventDefault();
};
