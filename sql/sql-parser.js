// ====================================================
// 🔍 SQL PARSER — FIXED VERSION
// ====================================================

export function sqlParse(query) {
  if (!query.toLowerCase().startsWith("select"))
    throw new Error("select_required");

  query = query.replace(/\s+/g, " ").trim();

  // SELECT
  const selectPart = query.match(/select (.*?) from/i);
  if (!selectPart) throw new Error("from_missing");

  let selectFields = selectPart[1].split(",").map(f => f.trim());

  // Manejar SELECT *
  if (selectFields.length === 1 && selectFields[0] === "*") {
    selectFields = ["*"];
  }

  // FROM
  const fromPart = query.match(/from (\w+)/i);
  if (!fromPart) throw new Error("table_missing");

  const table = fromPart[1];

  // WHERE
  const wherePart = query.match(/where (.*?)( order by| limit|$)/i);

  let where = null;

  if (wherePart) {
    const clauses = wherePart[1].split(/ and /i).map(c => c.trim());

    where = clauses.map(c => {
      const match = c.match(/(\w+)\s*(=|<>|>=|<=|>|<|like)\s*'?(.+?)'?$/i);
      if (!match) throw new Error("where_syntax");

      return {
        field: match[1],
        op: match[2].toUpperCase(),
        value: match[3]
      };
    });
  }

  // ORDER BY
  let orderBy = null;
  const orderPart = query.match(/order by (\w+) (asc|desc)/i);
  if (orderPart)
    orderBy = { field: orderPart[1], direction: orderPart[2].toUpperCase() };

  // LIMIT
  let limit = null;
  const limitPart = query.match(/limit (\d+)/i);
  if (limitPart) limit = Number(limitPart[1]);

  return {
    select: selectFields,
    from: table,
    where,
    orderBy,
    limit
  };
}
