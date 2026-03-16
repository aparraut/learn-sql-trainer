// =====================================================
// Table preview per level (safe DOM rendering)
// =====================================================

import { getTables } from "../sql/sql-engine.js";

function renderSingleTable(tableName, rows) {
  const fragment = document.createDocumentFragment();

  if (!rows || rows.length === 0) {
    const message = document.createElement("p");
    message.textContent = "No hay datos en la tabla.";
    fragment.appendChild(message);
    return fragment;
  }

  const headers = Object.keys(rows[0]);

  const title = document.createElement("h3");
  title.style.marginBottom = "10px";
  title.style.color = "#00ff88";
  title.textContent = `Tabla: ${tableName}`;
  fragment.appendChild(title);

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    headers.forEach((header) => {
      const td = document.createElement("td");
      td.textContent = row[header] == null ? "" : String(row[header]);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  fragment.appendChild(table);
  return fragment;
}

export function renderTablePreview(tableName) {
  const tables = getTables();
  const fragment = document.createDocumentFragment();

  if (tableName === "join_example") {
    const intro = document.createElement("p");
    intro.style.opacity = "0.7";
    intro.textContent = "Tablas disponibles para JOIN:";
    fragment.appendChild(intro);

    ["users", "orders", "products"].forEach((name) => {
      if (tables[name]) {
        fragment.appendChild(renderSingleTable(name, tables[name]));
      }
    });

    return fragment;
  }

  if (!tables[tableName]) {
    const message = document.createElement("p");
    message.style.opacity = "0.6";
    message.textContent = "No hay tabla asociada para este nivel.";
    fragment.appendChild(message);
    return fragment;
  }

  fragment.appendChild(renderSingleTable(tableName, tables[tableName]));
  return fragment;
}
