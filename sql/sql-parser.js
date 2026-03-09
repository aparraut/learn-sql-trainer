// ======================================================
// 🔍 SQL PARSER PRO — Full JOIN/WHERE/ORDER Support
// ======================================================

export function parseSQL(query) {
  query = query.trim().replace(/;+\s*$/, "").replace(/\s+/g, " ");

  if (!/^select/i.test(query)) throw new Error("select_required");

  // ------------------------------------------
  // BASIC STRUCTURE
  // ------------------------------------------
  const selectPart = query.match(/select (.*?) from/i);
  if (!selectPart) throw new Error("from_missing");

  const selectStr = selectPart[1].trim();

  const rest = query.substring(selectPart[0].length).trim();

  // ------------------------------------------
  // FROM
  // ------------------------------------------
  const fromMatch = rest.match(/^(\w+)/);
  if (!fromMatch) throw new Error("table_missing");

  const from = fromMatch[1].toLowerCase();
  let pos = from.length;
  let joins = [];

  // ------------------------------------------
  // JOINS
  // ------------------------------------------
  const joinPattern = /^\s*join\s+(\w+)\s+on\s+(.*?)(?=\s+join\b|\s+where\b|\s+order\s+by\b|\s+limit\b|$)/i;

  while (true) {
    const chunk = rest.substring(pos);
    const joinMatch = chunk.match(joinPattern);
    if (!joinMatch) break;

    joins.push({
      table: joinMatch[1].toLowerCase(),
      on: parseExpression(joinMatch[2].trim())
    });

    pos += joinMatch[0].length;
  }

  // ------------------------------------------
  // WHERE
  // ------------------------------------------
  let where = null;
  const whereMatch = rest.match(/\bwhere\b (.*?)(\border by\b|\blimit\b|$)/i);
  if (whereMatch) {
    where = parseExpression(whereMatch[1].trim());
  }

  // ------------------------------------------
  // ORDER BY
  // ------------------------------------------
  const orderBy = [];
  const orderMatch = rest.match(/\border by\b (.*?)(\blimit\b|$)/i);
  if (orderMatch) {
    const parts = orderMatch[1].split(",");
    parts.forEach(p => {
      const m = p.trim().match(/([\w.]+)( asc| desc)?/i);
      if (m) {
        orderBy.push({
          field: m[1].toLowerCase(),
          direction: (m[2] || "ASC").trim().toUpperCase()
        });
      }
    });
  }

  // ------------------------------------------
  // LIMIT
  // ------------------------------------------
  let limit = null;
  const limitMatch = rest.match(/limit (\d+)/i);
  if (limitMatch) limit = Number(limitMatch[1]);

  // ------------------------------------------
  // SELECT FIELDS
  // ------------------------------------------
  let select = selectStr.split(",").map(s => s.trim().toLowerCase());

  return {
    select,
    from,
    joins,
    where,
    orderBy,
    limit
  };
}

// ======================================================
// EXPRESSION PARSER (WHERE / ON)
// Supports:
//  - a = b
//  - a >= 10
//  - name LIKE '%a%'
//  - parentheses
//  - AND / OR
// ======================================================

function parseExpression(str) {
  str = stripOuterParentheses(str.trim());

  let depth = 0;
  let lastAnd = -1;
  let lastOr = -1;

  // Find main AND/OR outside parentheses
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === "(") depth++;
    if (c === ")") depth--;
    if (depth === 0) {
      if (str.substring(i, i + 3).toUpperCase() === "OR ") lastOr = i;
      if (str.substring(i, i + 4).toUpperCase() === "AND ") lastAnd = i;
    }
  }

  // OR has lower precedence
  if (lastOr !== -1) {
    return {
      type: "or",
      left: parseExpression(str.substring(0, lastOr).trim()),
      right: parseExpression(str.substring(lastOr + 2).trim())
    };
  }

  // AND
  if (lastAnd !== -1) {
    return {
      type: "and",
      left: parseExpression(str.substring(0, lastAnd).trim()),
      right: parseExpression(str.substring(lastAnd + 3).trim())
    };
  }

  // BASIC COMPARISON
  const cmp = str.match(/^([\w.]+)\s*(=|<>|>=|<=|>|<|like)\s*(.+)$/i);
  if (!cmp) throw new Error("where_syntax");

  const left = cmp[1].toLowerCase();
  const op = cmp[2].toUpperCase();
  const rawRight = cmp[3].trim();

  return {
    type: "binary",
    left: { type: "field", name: left },
    op,
    right: parseOperand(rawRight)
  };
}

function stripOuterParentheses(str) {
  let out = str;

  while (out.startsWith("(") && out.endsWith(")")) {
    let depth = 0;
    let balanced = true;

    for (let i = 0; i < out.length; i++) {
      if (out[i] === "(") depth++;
      if (out[i] === ")") depth--;
      if (depth === 0 && i < out.length - 1) {
        balanced = false;
        break;
      }
    }

    if (!balanced) break;
    out = out.slice(1, -1).trim();
  }

  return out;
}

function parseOperand(raw) {
  const token = raw.trim().replace(/;+\s*$/, "");

  const quoted = token.match(/^'(.*)'$/);
  if (quoted) {
    return { type: "value", value: quoted[1].replace(/''/g, "'") };
  }

  if (/^-?\d+(\.\d+)?$/.test(token)) {
    return { type: "value", value: Number(token) };
  }

  if (/^[\w.]+$/.test(token)) {
    return { type: "field", name: token.toLowerCase() };
  }

  throw new Error("where_syntax");
}
