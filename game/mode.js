let currentMode = "sql";

export function setMode(mode) {
  if (mode !== "sql" && mode !== "js") return;
  currentMode = mode;
}

export function getMode() {
  return currentMode;
}

export function isSqlMode() {
  return currentMode === "sql";
}
