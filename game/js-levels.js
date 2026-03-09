import { showScreen } from "../ui/screens.js";
import { getMode } from "./mode.js";

let jsLevels = [];
let currentJsLevel = 1;
let timer = null;
let remainingTime = 0;
let attempts = 0;
let hintStep = 0;
let solutionRevealed = false;
let runShortcutBound = false;

const HINT_STEPS = 3;
const PROGRESS_KEY = "js_progress_v1";

export async function loadJsLevels() {
  const res = await fetch("./data/js-levels.json");
  if (!res.ok) throw new Error(`No se pudieron cargar niveles JS (HTTP ${res.status})`);
  jsLevels = await res.json();
}

export function getJsLevels() {
  return jsLevels;
}

export function getJsProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) {
      return { max_level: 1, total_score: 0 };
    }
    const parsed = JSON.parse(raw);
    return {
      max_level: Number(parsed.max_level) || 1,
      total_score: Number(parsed.total_score) || 0,
    };
  } catch {
    return { max_level: 1, total_score: 0 };
  }
}

function saveJsProgress(maxLevel, totalScore) {
  localStorage.setItem(
    PROGRESS_KEY,
    JSON.stringify({
      max_level: maxLevel,
      total_score: totalScore,
      updated_at: new Date().toISOString(),
    })
  );
}

export async function startJsLevel(id) {
  currentJsLevel = id;
  attempts = 0;
  hintStep = 0;
  solutionRevealed = false;

  const level = jsLevels[id - 1];
  if (!level) throw new Error("Nivel JS no encontrado.");

  const progress = getJsProgress();
  document.getElementById("score").innerText = `Puntos: ${progress.total_score}`;

  renderLevelInfo(level);
  document.getElementById("challenge-title").innerText = `JS Desafio ${level.id}`;
  document.getElementById("challenge-description").innerText = level.description;

  const input = document.getElementById("sql-input");
  input.value = level.starterCode || "";
  input.focus();

  renderTestsPreview(level.tests);
  clearResultArea();
  setHintText("");
  setTutorTip("");
  setFeedback("", "info");

  bindLearningControls();
  updateHintProgress();
  startTimer(level.timeLimit || 60);
  showScreen("screen-game");
}

export async function checkJsAnswer(timeout = false) {
  try {
    clearInterval(timer);
    const level = jsLevels[currentJsLevel - 1];
    if (!level) throw new Error("Nivel JS actual no disponible.");

    const code = document.getElementById("sql-input").value.trim();
    if (!code) {
      if (timeout) {
        setFeedback("Tiempo agotado. Intenta de nuevo el nivel JS.", "warning");
        return;
      }
      setFeedback("Escribe codigo antes de ejecutar.", "info");
      resumeTimerIfNeeded();
      return;
    }

    const result = executeJsLevel(code, level);
    renderJsResultTable(result.testResults || []);

    if (!result.ok) {
      attempts++;
      updateHintProgress();
      setFeedback(result.message, "warning");
      setTutorTip(buildJsTutorTip(level, result));
      showResultArea();
      resumeTimerIfNeeded();
      playErrorSound();
      return;
    }

    playVictorySound();
    const progress = getJsProgress();
    const reward = level.reward ?? 10;
    const newMaxLevel = Math.max(progress.max_level, currentJsLevel + 1);
    const newScore = progress.total_score + reward;
    saveJsProgress(newMaxLevel, newScore);
    document.getElementById("score").innerText = `Puntos: ${newScore}`;

    setTutorTip("");
    setFeedback(
      solutionRevealed
        ? "Correcto. Bien hecho: revisa por que funciona."
        : "Correcto. Excelente trabajo en JavaScript.",
      "success"
    );

    hideResultArea();
    showWinModal(level, newScore);
  } catch (error) {
    setFeedback(`Error al evaluar JS: ${error.message || error}`, "error");
    setTutorTip("Tutor JS: revisa sintaxis y que declares la funcion solicitada.");
  }
}

function executeJsLevel(code, level) {
  const fnName = level.functionName;
  let userFn;

  try {
    const factory = new Function(
      `"use strict"; ${code}; if (typeof ${fnName} !== "function") { throw new Error("Debes definir function ${fnName}(...)."); } return ${fnName};`
    );
    userFn = factory();
  } catch (error) {
    return {
      ok: false,
      message: `Error de sintaxis/definicion: ${error.message}`,
      errorType: "syntax",
      testResults: [],
    };
  }

  const testResults = [];
  for (const test of level.tests) {
    try {
      const output = userFn(...test.input);
      const pass = deepEqual(output, test.expected);
      testResults.push({ input: test.input, expected: test.expected, output, pass });
    } catch (error) {
      testResults.push({
        input: test.input,
        expected: test.expected,
        output: `Error: ${error.message}`,
        pass: false,
      });
    }
  }

  const failed = testResults.filter((t) => !t.pass);
  if (failed.length > 0) {
    return {
      ok: false,
      message: `Fallaron ${failed.length}/${testResults.length} tests.`,
      errorType: "tests",
      testResults,
    };
  }

  return { ok: true, message: "Todos los tests pasaron.", testResults };
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function renderTestsPreview(tests) {
  const preview = document.getElementById("table-preview");
  const title = document.createElement("h3");
  title.textContent = "Tests del desafio JS";

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const tr = document.createElement("tr");
  ["Input", "Expected"].forEach((h) => {
    const th = document.createElement("th");
    th.textContent = h;
    tr.appendChild(th);
  });
  thead.appendChild(tr);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  tests.forEach((test) => {
    const row = document.createElement("tr");
    const tdInput = document.createElement("td");
    tdInput.textContent = JSON.stringify(test.input);
    const tdExpected = document.createElement("td");
    tdExpected.textContent = JSON.stringify(test.expected);
    row.append(tdInput, tdExpected);
    tbody.appendChild(row);
  });
  table.appendChild(tbody);

  preview.replaceChildren(title, table);
}

function renderJsResultTable(testResults) {
  const hidden = document.getElementById("hidden-result");
  if (!hidden) return;

  if (!testResults.length) {
    const p = document.createElement("p");
    p.textContent = "Sin resultados.";
    hidden.replaceChildren(p);
    return;
  }

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const tr = document.createElement("tr");
  ["Input", "Expected", "Output", "Pass"].forEach((h) => {
    const th = document.createElement("th");
    th.textContent = h;
    tr.appendChild(th);
  });
  thead.appendChild(tr);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  testResults.forEach((t) => {
    const row = document.createElement("tr");
    const cells = [
      JSON.stringify(t.input),
      JSON.stringify(t.expected),
      typeof t.output === "string" ? t.output : JSON.stringify(t.output),
      t.pass ? "OK" : "FAIL",
    ];
    cells.forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value;
      row.appendChild(td);
    });
    tbody.appendChild(row);
  });
  table.appendChild(tbody);

  hidden.replaceChildren(table);
}

function renderLevelInfo(level) {
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
  group.textContent = level.groupName;

  const details = document.createTextNode(
    ` · Modo: JavaScript · Dificultad: ${level.difficulty}/10 · Tiempo: ${level.timeLimit}s · Recompensa: ${level.reward} pts`
  );
  infoLine.append(group, details);
  info.replaceChildren(infoLine);
}

function bindLearningControls() {
  const hintBtn = document.getElementById("btn-hint");
  const solutionBtn = document.getElementById("btn-show-solution");
  const input = document.getElementById("sql-input");

  hintBtn.onclick = () => revealNextHint();
  solutionBtn.onclick = () => revealSolution();

  if (!runShortcutBound) {
    input.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        if (getMode() !== "js") return;
        event.preventDefault();
        checkJsAnswer(false);
      }
    });
    runShortcutBound = true;
  }
}

function revealNextHint() {
  const level = jsLevels[currentJsLevel - 1];
  if (!level) return;
  if (hintStep >= HINT_STEPS) {
    setFeedback("Ya viste todas las pistas disponibles.", "info");
    return;
  }

  hintStep++;
  if (hintStep === 1) {
    setHintText(`Paso 1: define la funcion ${level.functionName}(...) y retorna un valor.`);
  } else if (hintStep === 2) {
    setHintText(`Paso 2: ${level.hint}`);
  } else {
    setHintText(`Paso 3: estructura sugerida -> ${buildSkeleton(level.solution)}`);
  }
  updateHintProgress();
}

function revealSolution() {
  const level = jsLevels[currentJsLevel - 1];
  if (!level) return;
  solutionRevealed = true;
  const input = document.getElementById("sql-input");
  input.value = level.solution;
  input.focus();
  setFeedback("Solucion cargada. Ejecuta y revisa test por test.", "info");
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
  hintProgress.textContent = `Intentos: ${attempts} · Pistas: ${hintStep}/${HINT_STEPS}`;
  if (attempts >= 3) solutionBtn.classList.remove("hidden");
  else solutionBtn.classList.add("hidden");
}

function buildJsTutorTip(level, result) {
  if (result.errorType === "syntax") {
    return `Tutor JS: asegurate de declarar function ${level.functionName}(...) y cerrar llaves/parentesis.`;
  }

  return "Tutor JS: revisa el valor de retorno para cada caso de test y evita mutar datos sin necesidad.";
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

function setFeedback(message, type = "info") {
  const feedback = document.getElementById("feedback");
  if (!feedback) return;
  feedback.textContent = message;
  feedback.classList.remove("success", "error", "info", "warning");
  if (message) feedback.classList.add(type);
}

function clearResultArea() {
  const result = document.getElementById("result-table");
  result.replaceChildren();
  result.style.display = "none";
  const header = document.getElementById("result-header");
  if (header) header.style.display = "none";
  const hidden = document.getElementById("hidden-result");
  if (hidden) hidden.replaceChildren();
}

function showResultArea() {
  const result = document.getElementById("result-table");
  const hidden = document.getElementById("hidden-result");
  result.replaceChildren(...Array.from(hidden.childNodes).map((n) => n.cloneNode(true)));
  result.style.display = "block";
  const header = document.getElementById("result-header");
  if (header) header.style.display = "block";
}

function hideResultArea() {
  const header = document.getElementById("result-header");
  if (header) header.style.display = "none";
  document.getElementById("result-table").style.display = "none";
}

function playVictorySound() {
  const sfx = document.getElementById("sfx-victory");
  if (sfx) {
    sfx.currentTime = 0;
    sfx.play().catch(() => {});
  }
}

function playErrorSound() {
  const sfx = document.getElementById("sfx-error");
  if (sfx) {
    sfx.currentTime = 0;
    sfx.play().catch(() => {});
  }
}

function startTimer(seconds) {
  clearInterval(timer);
  remainingTime = seconds;
  updateTimerUI();

  timer = setInterval(() => {
    remainingTime--;
    updateTimerUI();
    if (remainingTime < 0) {
      clearInterval(timer);
      checkJsAnswer(true);
    }
  }, 1000);
}

function resumeTimerIfNeeded() {
  if (remainingTime > 0) startTimer(remainingTime);
}

function updateTimerUI() {
  document.getElementById("timer").innerText = `${Math.max(remainingTime, 0)}s`;
}

function goToNextLevel() {
  currentJsLevel++;
  if (currentJsLevel > jsLevels.length) {
    alert("Has completado todos los niveles JS.");
    return;
  }
  startJsLevel(currentJsLevel);
}

function showWinModal(level, newScore) {
  const win = document.getElementById("win-modal");
  if (!win) return;
  win.classList.remove("hidden");

  const timeLeft = document.getElementById("timer").innerText;
  document.getElementById("win-time").innerText = `Tiempo restante: ${timeLeft}`;
  document.getElementById("win-reward").innerText = `Puntos obtenidos: +${level.reward}`;
  document.getElementById("win-total").innerText = `Total acumulado JS: ${newScore} pts`;

  const hidden = document.getElementById("hidden-result");
  const winTable = document.getElementById("win-result-table");
  winTable.replaceChildren(...Array.from(hidden.childNodes).map((n) => n.cloneNode(true)));

  document.getElementById("win-next").onclick = () => {
    win.classList.add("hidden");
    goToNextLevel();
  };
}
