// ======================================================
// ❌ SQL Error Handler PRO
// ======================================================

export function sqlError(code) {
  return [{
    error: "❌ " + ({
      "select_required": "La consulta debe comenzar con SELECT.",
      "from_missing": "Falta la cláusula FROM.",
      "table_missing": "La tabla indicada no existe.",
      "where_syntax": "Sintaxis incorrecta en WHERE/ON.",
    }[code] || "SQL no válido.")
  }];
}
