// ====================================================
// 🧠 SQL ENGINE 2.0 — FIXED VERSION (SELECT * WORKING)
// ====================================================

import { sqlParse } from "./sql-parser.js";
import { sqlError } from "./sql-errors.js";

let tables = {};

(async function loadTables() {
  const res = await fetch("../data/tables.json");
  tables = await res.json();
})();

export function getTables() {
  return tables;
}

export function executeSQL(query) {
  try {
    const parsed = sqlParse(query);
    return runQuery(parsed);
  } catch (err) {
    return sqlError(err.message);
  }
}

// =========================================
// Ejecuta el árbol SQL
// =========================================
function runQuery(q) {
  let data = [...tables[q.from]];

  // WHERE
  if (q.where) {
    data = data.filter(row => evalWhere(row, q.where));
  }

  // ORDER BY
  if (q.orderBy) {
    const { field, direction } = q.orderBy;
    data.sort((a, b) => {
      if (a[field] < b[field]) return direction === "DESC" ? 1 : -1;
      if (a[field] > b[field]) return direction === "DESC" ? -1 : 1;
      return 0;
    });
  }

  // LIMIT
  if (q.limit) {
    data = data.slice(0, q.limit);
  }

  // COUNT(*)
  if (q.select.includes("count(*)")) {
    return [{ count: data.length }];
  }

  // SELECT *
  let fields = q.select;
  if (fields.length === 1 && fields[0] === "*") {
    fields = Object.keys(data[0] || {});
  }

  // Producir filas
  return data.map(row => {
    const out = {};
    fields.forEach(f => {
      out[f] = row[f] !== undefined ? row[f] : null;
    });
    return out;
  });
}

// =========================================
// WHERE evaluator
// =========================================
function evalWhere(row, where) {
  return where.every(condition => {
    const { field, op, value } = condition;

    const left = row[field];
    const right = isNaN(value) ? value : Number(value);

    switch (op) {
      case "=": return left == right;
      case ">": return left > right;
      case "<": return left < right;
      case ">=": return left >= right;
      case "<=": return left <= right;
      case "<>": return left != right;
      case "LIKE":
        const regex = new RegExp("^" + value.replace(/%/g, ".*") + "$", "i");
        return regex.test(String(left));
      default:
        return false;
    }
  });
}
