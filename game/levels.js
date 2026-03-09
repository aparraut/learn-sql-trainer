// ==========================================
// Niveles
// ==========================================
import { renderTablePreview } from "./table-preview.js";
import { showScreen } from "../ui/screens.js";
import { executeSQL } from "../sql/sql-engine.js";
import { parseSQL } from "../sql/sql-parser.js";
import { getProgress, saveProgress, upsertRanking } from "../supabase.js";

let levels = [];
let currentLevel = 1;
let timer = null;
let remainingTime = 0;
let attempts = 0;
let hintStep = 0;
let solutionRevealed = false;
let runShortcutBound = false;

const HINT_STEPS = 3;

// ===============================
// Cargar levels.json
// ===============================
export async function loadLevels() {
  try {
    const res = await fetch("./data/levels.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    levels = await res.json();
  } catch (error) {
    throw new Error(`No se pudieron cargar los niveles: ${error.message || error}`);
  }
}

// ===============================
// Start a level
// ===============================
export async function startLevel(id) {
  try {
    currentLevel = id;
    attempts = 0;
    hintStep = 0;
    solutionRevealed = false;

    const progress = await getProgress();
    const score = progress?.total_score ?? 0;
    document.getElementById("score").innerText = `Puntos: ${score}`;

    const lvl = levels[id - 1];
    if (!lvl) throw new Error("Nivel no encontrado.");

    renderLevelInfo(lvl);
    document.getElementById("challenge-title").innerText = `Desafio ${lvl.id}`;
    document.getElementById("challenge-description").innerText = lvl.description;
    setHintText("");
    setTutorTip("");
    setFeedback("", "info");

    const preview = document.getElementById("table-preview");
    preview.replaceChildren(renderTablePreview(lvl.table));

    const sqlInput = document.getElementById("sql-input");
    sqlInput.value = "";
    sqlInput.focus();

    document.getElementById("result-table").replaceChildren();
    document.getElementById("result-table").style.display = "none";
    const header = document.getElementById("result-header");
    if (header) header.style.display = "none";

    const hidden = document.getElementById("hidden-result");
    if (hidden) hidden.replaceChildren();

    bindLearningControls();
    updateHintProgress();
    startTimer(lvl.timeLimit || 60);
    showScreen("screen-game");
  } catch (error) {
    const message = `No se pudo iniciar el nivel: ${error.message || error}`;
    setFeedback(message, "error");
    alert(message);
  }
}

function renderLevelInfo(lvl) {
  const info = document.getElementById("level-info");
  const infoLine = document.createElement("div");
  infoLine.style.fontSize = "13px";
  infoLine.style.color = "#d4ffe4";
  infoLine.style.textAlign = "center";
  infoLine.style.letterSpacing = "0.2px";
  infoLine.style.marginBottom = "4px";

  const group = document.createElement("span");
  group.style.color = "#00ff88";
  group.style.fontWeight = "600";
  group.textContent = lvl.groupName;

  const details = document.createTextNode(
    ` · Dificultad: ${lvl.difficulty}/10 · Tiempo: ${lvl.timeLimit}s · Recompensa: ${lvl.reward} pts`
  );

  infoLine.append(group, details);
  info.replaceChildren(infoLine);
}

function bindLearningControls() {
  const hintBtn = document.getElementById("btn-hint");
  const solutionBtn = document.getElementById("btn-show-solution");
  const sqlInput = document.getElementById("sql-input");

  hintBtn.onclick = () => revealNextHint();
  solutionBtn.onclick = () => revealSolution();

  if (!runShortcutBound) {
    sqlInput.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        checkAnswer(false);
      }
    });
    runShortcutBound = true;
  }
}

// ===============================
// Timer
// ===============================
function startTimer(seconds) {
  clearInterval(timer);
  remainingTime = seconds;
  updateTimerUI();

  timer = setInterval(() => {
    remainingTime--;
    updateTimerUI();

    if (remainingTime < 0) {
      clearInterval(timer);
      checkAnswer(true);
    }
  }, 1000);
}

function updateTimerUI() {
  document.getElementById("timer").innerText = `${Math.max(remainingTime, 0)}s`;
}

// ===============================
// Evaluar respuesta
// ===============================
export async function checkAnswer(timeout = false) {
  try {
    clearInterval(timer);

    const lvl = levels[currentLevel - 1];
    if (!lvl) throw new Error("Nivel actual no disponible.");

    const input = document.getElementById("sql-input").value.trim();
    if (!input) {
      if (timeout) {
        setFeedback("Tiempo agotado. Intenta de nuevo el nivel.", "warning");
        setTutorTip("Tutor: relee el objetivo y prueba una consulta minima con SELECT ... FROM ...");
        return;
      }
      setFeedback("Escribe una consulta antes de ejecutar.", "info");
      setTutorTip("Tutor: comienza por la estructura base SELECT ... FROM ...");
      resumeTimerIfNeeded();
      return;
    }

    const result = executeSQL(input);
    const expected = executeSQL(lvl.solution);
    const expectedHasError = isErrorResult(expected);
    const userHasError = isErrorResult(result);
    const correct = !userHasError && !expectedHasError && JSON.stringify(result) === JSON.stringify(expected);

    renderTable(result);

    if (expectedHasError) {
      setFeedback("Error interno del nivel: la solucion oficial es invalida.", "error");
      setTutorTip("Tutor: este nivel tiene un problema de configuracion. Pasa al siguiente.");
      revealVisibleResult();
      return;
    }

    if (correct) {
      const sfx = document.getElementById("sfx-victory");
      if (sfx) {
        sfx.currentTime = 0;
        sfx.play().catch(() => {});
      }

      const progress = await getProgress();
      if (!progress) throw new Error("No se pudo leer el progreso del usuario.");

      const reward = lvl.reward ?? 10;
      const newMaxLevel = Math.max(progress.max_level, currentLevel + 1);
      const newScore = progress.total_score + reward;

      await saveProgress(newMaxLevel, newScore);
      await upsertRanking(newScore);

      setFeedback(
        solutionRevealed
          ? "Correcto. Bien hecho: revisa por que esta solucion funciona."
          : "Correcto. Excelente trabajo.",
        "success"
      );
      setTutorTip("");

      const header = document.getElementById("result-header");
      if (header) header.style.display = "none";
      document.getElementById("result-table").style.display = "none";
      showWinModal(lvl, newScore);
      return;
    }

    attempts++;
    updateHintProgress();

    const snd = document.getElementById("sfx-error");
    if (snd) {
      snd.currentTime = 0;
      snd.play().catch(() => {});
    }

    if (userHasError) {
      setFeedback(`Error de SQL: ${result[0].error}`, "error");
    } else {
      setFeedback("Resultado incorrecto. Revisa filtros, columnas y orden.", "warning");
    }
    setTutorTip(buildTutorTip(lvl, input, result));

    revealVisibleResult();
    resumeTimerIfNeeded();
  } catch (error) {
    setFeedback(`Error al evaluar: ${error.message || error}`, "error");
    setTutorTip("Tutor: valida sintaxis basica (SELECT, FROM, WHERE, ORDER BY, LIMIT).");
  }
}

function resumeTimerIfNeeded() {
  if (remainingTime > 0) {
    startTimer(remainingTime);
  }
}

function revealVisibleResult() {
  const visible = document.getElementById("result-table");
  copyHiddenResultInto(visible);
  visible.style.display = "block";

  const header = document.getElementById("result-header");
  if (header) header.style.display = "block";
}

function revealNextHint() {
  const lvl = levels[currentLevel - 1];
  if (!lvl) return;

  if (hintStep >= HINT_STEPS) {
    setFeedback("Ya viste todas las pistas disponibles.", "info");
    return;
  }

  hintStep++;
  const hint = buildHintForStep(lvl, hintStep);
  setHintText(hint);
  updateHintProgress();
}

function revealSolution() {
  const lvl = levels[currentLevel - 1];
  if (!lvl) return;

  solutionRevealed = true;
  const sqlInput = document.getElementById("sql-input");
  sqlInput.value = lvl.solution;
  sqlInput.focus();

  setFeedback("Solucion cargada. Ejecutala y analiza cada clausula.", "info");
}

function buildHintForStep(lvl, step) {
  if (step === 1) {
    return `Paso 1: identifica tabla principal (${lvl.table}) y objetivo del desafio.`;
  }

  if (step === 2) {
    return `Paso 2: pista del nivel -> ${lvl.hint}`;
  }

  return `Paso 3: estructura sugerida -> ${buildSkeleton(lvl.solution)}`;
}

function buildSkeleton(solution) {
  return solution
    .replace(/'[^']*'/g, "'...'")
    .replace(/\b\d+(\.\d+)?\b/g, "N")
    .replace(/\s+/g, " ")
    .trim();
}

function updateHintProgress() {
  const hintProgress = document.getElementById("hint-progress");
  const solutionBtn = document.getElementById("btn-show-solution");
  const canRevealSolution = attempts >= 3;

  hintProgress.textContent = `Intentos: ${attempts} · Pistas: ${hintStep}/${HINT_STEPS}`;

  if (canRevealSolution) {
    solutionBtn.classList.remove("hidden");
  } else {
    solutionBtn.classList.add("hidden");
  }
}

function setHintText(text) {
  const hintText = document.getElementById("hint-text");
  if (!text) {
    hintText.textContent = "";
    hintText.classList.add("hidden");
    return;
  }

  hintText.textContent = text;
  hintText.classList.remove("hidden");
}

function setFeedback(message, type = "info") {
  const feedback = document.getElementById("feedback");
  if (!feedback) return;

  feedback.textContent = message;
  feedback.classList.remove("success", "error", "info", "warning");
  if (message) feedback.classList.add(type);
}

function setTutorTip(message) {
  const tutor = document.getElementById("tutor-tip");
  if (!tutor) return;

  if (!message) {
    tutor.textContent = "";
    tutor.classList.add("hidden");
    return;
  }

  tutor.textContent = message;
  tutor.classList.remove("hidden");
}

function buildTutorTip(level, userSql, executionResult) {
  const userHasError = isErrorResult(executionResult);
  const errorMessage = userHasError ? String(executionResult[0].error || "") : "";

  if (userHasError) {
    if (errorMessage.toLowerCase().includes("from")) {
      return "Tutor: falta revisar FROM. Asegurate de indicar la tabla correcta del desafio.";
    }
    if (errorMessage.toLowerCase().includes("where")) {
      return "Tutor: revisa la condicion WHERE y el uso de comillas en textos.";
    }
    return level.exampleError
      ? `Tutor: revisa sintaxis. Ejemplo comun de error en este nivel: ${level.exampleError}`
      : "Tutor: revisa sintaxis SQL. Empieza por SELECT ... FROM ... y agrega clausulas gradualmente.";
  }

  try {
    const expectedAst = parseSQL(level.solution);
    const userAst = parseSQL(userSql);
    const tips = [];

    if (userAst.from !== expectedAst.from) {
      tips.push(`usa FROM ${expectedAst.from}`);
    }

    if (!sameList(userAst.select, expectedAst.select)) {
      tips.push("ajusta las columnas en SELECT");
    }

    if (expectedAst.joins.length !== userAst.joins.length) {
      tips.push(`revisa JOIN (esperado: ${expectedAst.joins.length})`);
    }

    if (Boolean(expectedAst.where) !== Boolean(userAst.where)) {
      tips.push(expectedAst.where ? "agrega WHERE" : "elimina WHERE innecesario");
    }
    if (expectedAst.where && userAst.where) {
      const whereTips = getWhereTutorTips(expectedAst.where, userAst.where);
      whereTips.forEach((tip) => tips.push(tip));
    }

    if (expectedAst.orderBy.length !== userAst.orderBy.length) {
      tips.push(expectedAst.orderBy.length > 0 ? "agrega ORDER BY" : "quita ORDER BY");
    }

    if ((expectedAst.limit ?? null) !== (userAst.limit ?? null)) {
      tips.push(`corrige LIMIT (esperado: ${expectedAst.limit ?? "sin limite"})`);
    }

    if (tips.length === 0) {
      return "Tutor: tu estructura general parece correcta; revisa valores concretos en filtros y operadores.";
    }

    return `Tutor: ${tips.slice(0, 3).join(" · ")}.`;
  } catch {
    return "Tutor: estructura invalida. Prueba construir la consulta por partes: SELECT, FROM, WHERE, ORDER BY, LIMIT.";
  }
}

function sameList(a, b) {
  if (a.length !== b.length) return false;
  return a.every((item, index) => item === b[index]);
}

function getWhereTutorTips(expectedWhere, userWhere) {
  const tips = [];

  const expectedOps = collectOperators(expectedWhere);
  const userOps = collectOperators(userWhere);

  const expectedLogic = expectedOps.filter((op) => op === "AND" || op === "OR");
  const userLogic = userOps.filter((op) => op === "AND" || op === "OR");
  if (!sameMultiset(expectedLogic, userLogic)) {
    tips.push(`revisa logica booleana (esperado: ${expectedLogic.join(", ") || "sin AND/OR"})`);
  }

  const expectedCmp = expectedOps.filter((op) => !["AND", "OR"].includes(op));
  const userCmp = userOps.filter((op) => !["AND", "OR"].includes(op));
  if (!sameMultiset(expectedCmp, userCmp)) {
    tips.push(`revisa operadores (esperado: ${expectedCmp.join(", ") || "ninguno"})`);
  }

  const expectedFields = collectWhereFields(expectedWhere);
  const userFields = collectWhereFields(userWhere);
  if (!sameMultiset(expectedFields, userFields)) {
    tips.push("revisa campos usados en WHERE");
  }

  return tips;
}

function collectOperators(node) {
  if (!node) return [];

  if (node.type === "binary") return [String(node.op || "").toUpperCase()];
  if (node.type === "and") return ["AND", ...collectOperators(node.left), ...collectOperators(node.right)];
  if (node.type === "or") return ["OR", ...collectOperators(node.left), ...collectOperators(node.right)];

  return [];
}

function collectWhereFields(node) {
  if (!node) return [];

  if (node.type === "binary") {
    const left = node.left?.type === "field" ? [String(node.left.name).toLowerCase()] : [];
    const right = node.right?.type === "field" ? [String(node.right.name).toLowerCase()] : [];
    return [...left, ...right];
  }

  return [...collectWhereFields(node.left), ...collectWhereFields(node.right)];
}

function sameMultiset(a, b) {
  if (a.length !== b.length) return false;

  const count = new Map();
  a.forEach((item) => count.set(item, (count.get(item) || 0) + 1));

  for (const item of b) {
    if (!count.has(item)) return false;
    const next = count.get(item) - 1;
    if (next === 0) {
      count.delete(item);
    } else {
      count.set(item, next);
    }
  }

  return count.size === 0;
}

// ===============================
// Render table (en contenedor oculto)
// ===============================
function renderTable(rows) {
  const container = document.getElementById("hidden-result");
  if (!container) return;

  if (rows && rows[0] && rows[0].error) {
    const message = document.createElement("p");
    message.style.color = "#ff3366";
    message.style.fontWeight = "bold";
    message.textContent = rows[0].error;
    container.replaceChildren(message);
    return;
  }

  if (!rows || rows.length === 0) {
    const message = document.createElement("p");
    message.textContent = "Sin resultados.";
    container.replaceChildren(message);
    return;
  }

  const headers = Object.keys(rows[0]);
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
  container.replaceChildren(table);
}

// ===============================
// Go to next level
// ===============================
function goToNextLevel() {
  currentLevel++;

  if (currentLevel > levels.length) {
    alert("Has completado todos los niveles");
    return;
  }

  startLevel(currentLevel);
}

// ===============================
// Modal de victoria
// ===============================
function showWinModal(lvl, newScore) {
  const win = document.getElementById("win-modal");
  if (!win) return;

  win.classList.remove("hidden");

  const timeLeft = document.getElementById("timer").innerText;
  document.getElementById("win-time").innerText = `Tiempo restante: ${timeLeft}`;
  document.getElementById("win-reward").innerText = `Puntos obtenidos: +${lvl.reward}`;
  document.getElementById("win-total").innerText = `Total acumulado: ${newScore} pts`;

  const winTable = document.getElementById("win-result-table");
  copyHiddenResultInto(winTable);

  const rows = document.querySelectorAll("#win-result-table tr");
  rows.forEach((row, i) => {
    row.style.animationDelay = `${i * 0.03}s`;
  });

  document.getElementById("win-next").onclick = () => {
    win.classList.add("hidden");
    goToNextLevel();
  };
}

function copyHiddenResultInto(target) {
  const hidden = document.getElementById("hidden-result");
  if (!target || !hidden) return;

  target.replaceChildren();
  hidden.childNodes.forEach((node) => {
    target.appendChild(node.cloneNode(true));
  });
}

function isErrorResult(rows) {
  return Array.isArray(rows) && rows.length > 0 && rows[0] && typeof rows[0].error === "string";
}
