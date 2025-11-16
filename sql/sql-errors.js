// ====================================================
// ❌ SQL Error Messages
// ====================================================

export function sqlError(code) {
  switch (code) {
    case "select_required":
      return [{ error: "❌ Error: La consulta debe comenzar con SELECT." }];
    case "from_missing":
      return [{ error: "❌ Error: Falta la cláusula FROM." }];
    case "table_missing":
      return [{ error: "❌ Error: Debes indicar una tabla válida." }];
    case "where_syntax":
      return [{ error: "❌ Error en WHERE: sintaxis incorrecta." }];
    default:
      return [{ error: "❌ SQL no válido." }];
  }
}
