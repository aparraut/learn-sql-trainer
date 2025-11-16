// =====================================================
// 📊 PREVIEW DE TABLAS PARA CADA NIVEL
// =====================================================

import { getTables } from "../sql/sql-engine.js";

export function renderTablePreview(tableName) {
  const tables = getTables();

  if (!tables[tableName]) {
    return `<p style="opacity:0.6;">No hay tabla asociada para este nivel.</p>`;
  }

  const rows = tables[tableName];
  if (rows.length === 0) {
    return `<p>No hay datos en la tabla.</p>`;
  }

  const headers = Object.keys(rows[0]);

  let html = `
    <h3 style="margin-bottom:10px; color:#00ff88;">📄 Tabla: ${tableName}</h3>
    <table>
      <thead><tr>
  `;

  headers.forEach(h => html += `<th>${h}</th>`);

  html += `</tr></thead><tbody>`;

  rows.forEach(row => {
    html += `<tr>`;
    headers.forEach(h => html += `<td>${row[h]}</td>`);
    html += `</tr>`;
  });

  html += `</tbody></table>`;

  return html;
}
