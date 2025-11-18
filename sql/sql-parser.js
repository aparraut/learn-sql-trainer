// ======================================================
// 🔍 SQL PARSER PRO — Full JOIN/WHERE/ORDER Support
// ======================================================

export function parseSQL(query) {
  query = query.trim().replace(/\s+/g, " ");

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

  const from = fromMatch[1];
  let pos = from.length;
  let joins = [];

  // ------------------------------------------
  // JOINS
  // ------------------------------------------
  const joinRegex = /\bjoin\b/i;

  while (joinRegex.test(rest.substring(pos))) {
    const joinMatch = rest.substring(pos).match(/join (\w+) on (.*?) (join|where|order|limit|$)/i);

    if (!joinMatch) break;

    const table = joinMatch[1];
    const onStr = joinMatch[2].trim();

    joins.push({
      table,
      on: parseExpression(onStr)
    });

    pos += joinMatch.index + joinMatch[0].length - (joinMatch[3] ? joinMatch[3].length : 0);
  }

  // ------------------------------------------
  // WHERE
  // ------------------------------------------
  let where = null;
  const whereMatch = rest.match(/where (.*?)( order by| limit|$)/i);
  if (whereMatch) {
    where = parseExpression(whereMatch[1].trim());
  }

  // ------------------------------------------
  // ORDER BY
  // ------------------------------------------
  const orderBy = [];
  const orderMatch = rest.match(/order by (.*?)( limit|$)/i);
  if (orderMatch) {
    const parts = orderMatch[1].split(",");
    parts.forEach(p => {
      const m = p.trim().match(/(\w+)( asc| desc)?/i);
      if (m) {
        orderBy.push({
          field: m[1],
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
  str = str.trim();

  // Handle parentheses recursively
  if (str.startsWith("(") && str.endsWith(")")) {
    return parseExpression(str.slice(1, -1));
  }

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
  const cmp = str.match(/(\w+)\s*(=|<>|>=|<=|>|<|like)\s*'?(.+?)'?$/i);
  if (!cmp) throw new Error("where_syntax");

  return {
    type: "binary",
    left: { type: "field", name: cmp[1] },
    op: cmp[2].toUpperCase(),
    right: { type: "value", value: cmp[3] }
  };
}
