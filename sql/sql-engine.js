// ======================================================
// 🧠 SQL ENGINE PRO — FULL SQL SUPPORT FOR THE GAME
// ======================================================

import { parseSQL } from "./sql-parser.js";
import { sqlError } from "./sql-errors.js";

let tables = {};

// ===============================
// Load tables.json
// ===============================
(async function loadTables() {
  const res = await fetch("../data/tables.json");
  tables = await res.json();
})();

export function getTables() {
  return tables;
}

// ===============================
// EXECUTE SQL QUERY
// ===============================
export function executeSQL(query) {
  try {
    const ast = parseSQL(query);
    const result = runQuery(ast);
    return result;
  } catch (e) {
    return sqlError(e.message);
  }
}

// ===============================
// RUN PARSED QUERY
// ===============================
function runQuery(ast) {
  // -------------------------
  // 1. LOAD BASE TABLE
  // -------------------------
  let rows = loadTable(ast.from);

  // -------------------------
  // 2. APPLY JOINS
  // -------------------------
  for (const join of ast.joins) {
    const joinRows = loadTable(join.table);
    rows = innerJoin(rows, joinRows, join.on);
  }

  // -------------------------
  // 3. APPLY WHERE
  // -------------------------
  if (ast.where) {
    rows = rows.filter(row => evalWhere(row, ast.where));
  }

  // -------------------------
  // 4. APPLY ORDER BY
  // -------------------------
  if (ast.orderBy.length > 0) {
    rows.sort((a, b) => {
      for (const rule of ast.orderBy) {
        const A = a[rule.field];
        const B = b[rule.field];

        if (A < B) return rule.direction === "DESC" ? 1 : -1;
        if (A > B) return rule.direction === "DESC" ? -1 : 1;
      }
      return 0;
    });
  }

  // -------------------------
  // 5. APPLY LIMIT
  // -------------------------
  if (ast.limit !== null) {
    rows = rows.slice(0, ast.limit);
  }

  // -------------------------
  // 6. HANDLE SELECT COUNT(*)
  // -------------------------
  if (ast.select.length === 1 && ast.select[0] === "count(*)") {
    return [{ count: rows.length }];
  }

  // -------------------------
  // 7. HANDLE SELECT *
  // -------------------------
  if (ast.select.length === 1 && ast.select[0] === "*") {
    return rows;
  }

  // -------------------------
  // 8. SELECT SPECIFIC FIELDS
  // -------------------------
  return rows.map(row => {
    const obj = {};
    ast.select.forEach(f => obj[f] = row[f]);
    return obj;
  });
}

// ======================================================
// LOAD TABLE
// ======================================================
function loadTable(name) {
  if (!tables[name]) throw new Error("table_missing");
  return JSON.parse(JSON.stringify(tables[name]));
}

// ======================================================
// INNER JOIN ENGINE
// ======================================================
function innerJoin(rowsA, rowsB, on) {
  const newRows = [];

  for (const A of rowsA) {
    for (const B of rowsB) {
      if (evalCondition({ ...A, ...B }, on)) {
        newRows.push({ ...A, ...B });
      }
    }
  }

  return newRows;
}

// ======================================================
// WHERE & ON EVALUATION
// Supports AND, OR, parentheses
// ======================================================
function evalWhere(row, tree) {
  return evalCondition(row, tree);
}

function evalCondition(row, node) {
  if (node.type === "binary") {
    const L = getValue(row, node.left);
    const R = getValue(row, node.right);

    switch (node.op) {
      case "=": return L == R;
      case "<>": return L != R;
      case ">": return L > R;
      case "<": return L < R;
      case ">=": return L >= R;
      case "<=": return L <= R;
      case "LIKE":
        const regex = new RegExp("^" + R.replace(/%/g, ".*") + "$", "i");
        return regex.test(String(L));
      default:
        return false;
    }
  }

  if (node.type === "and") {
    return evalCondition(row, node.left) && evalCondition(row, node.right);
  }

  if (node.type === "or") {
    return evalCondition(row, node.left) || evalCondition(row, node.right);
  }

  return false;
}

function getValue(row, ref) {
  if (ref.type === "value") return ref.value;

  if (ref.type === "field") {
    return row[ref.name];
  }

  return null;
}
