// ==============================================
// SQL Mind Trainer 2.0 - MAIN
// ==============================================

import { loadTablesData } from "./sql/sql-engine.js";
import {
  initSupabase,
  login,
  register,
  logout,
  requestPasswordReset,
  updatePassword,
  getCurrentUser,
  ensureProgressRow,
} from "./supabase.js";
import { showScreen } from "./ui/screens.js";
import { loadLevels, startLevel, checkAnswer } from "./game/levels.js";
import { loadJsLevels, startJsLevel, checkJsAnswer } from "./game/js-levels.js";
import { renderLevelMap } from "./game/level-map.js";
import { loadProgress } from "./game/progress.js";
import { computeAchievements } from "./game/achievements.js";
import { renderRanking } from "./game/ranking.js";
import { getMode, isSqlMode, setMode } from "./game/mode.js";

initSupabase();

const authMessage = document.getElementById("auth-message");
const startTitle = document.querySelector(".start-title");
const startSubtitle = document.querySelector(".start-subtitle");
const modeSqlBtn = document.getElementById("btn-mode-sql");
const modeJsBtn = document.getElementById("btn-mode-js");

document.getElementById("btn-login").onclick = async () => {
  try {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    const { error } = await login(email, password);
    if (error) {
      authMessage.innerText = error.message;
      return;
    }

    authMessage.innerText = "";
    await afterLogin();
  } catch (error) {
    authMessage.innerText = `Error al iniciar sesion: ${toMessage(error)}`;
  }
};

document.getElementById("btn-register").onclick = async () => {
  try {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    const { error } = await register(email, password);
    if (error) {
      authMessage.innerText = error.message;
      return;
    }

    authMessage.innerText = "Cuenta creada. Revisa tu email.";
  } catch (error) {
    authMessage.innerText = `Error al registrar: ${toMessage(error)}`;
  }
};

document.getElementById("btn-forgot-password").onclick = async () => {
  try {
    const email = document.getElementById("email").value.trim();
    if (!email) {
      authMessage.innerText = "Escribe tu email para recuperar la contrasena.";
      return;
    }

    const { error } = await requestPasswordReset(email);
    if (error) {
      authMessage.innerText = error.message;
      return;
    }

    authMessage.innerText = "Te enviamos un email para restablecer tu contrasena.";
  } catch (error) {
    authMessage.innerText = `Error al recuperar contrasena: ${toMessage(error)}`;
  }
};

document.getElementById("btn-logout").onclick = async () => {
  try {
    const { error } = await logout();
    if (error) {
      authMessage.innerText = error.message;
      return;
    }
    showScreen("screen-auth");
  } catch (error) {
    authMessage.innerText = `Error al cerrar sesion: ${toMessage(error)}`;
  }
};

document.getElementById("btn-start").onclick = () => {
  if (isSqlMode()) startLevel(1);
  else startJsLevel(1);
};

document.getElementById("btn-levels").onclick = async () => {
  await renderLevelMap();
  showScreen("screen-levels");
};

document.getElementById("btn-back-levels").onclick = () => {
  showScreen("screen-start");
};

document.getElementById("btn-back-game").onclick = async () => {
  await renderLevelMap();
  showScreen("screen-levels");
};

async function afterLogin() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      showScreen("screen-auth");
      return;
    }

    await ensureProgressRow();
    await loadTablesData();
    await loadLevels();
    await loadJsLevels();
    await loadProgress();
    await computeAchievements();
    updateModeUI();

    showScreen("screen-start");
  } catch (error) {
    authMessage.innerText = `Error al cargar datos: ${toMessage(error)}`;
    showScreen("screen-auth");
  }
}

document.getElementById("btn-run").onclick = () => {
  if (isSqlMode()) checkAnswer(false);
  else checkJsAnswer(false);
};

document.getElementById("btn-achievements").onclick = async () => {
  await computeAchievements();
  showScreen("screen-achievements");
};

document.getElementById("btn-back-achievements").onclick = () => {
  showScreen("screen-start");
};

document.getElementById("btn-ranking").onclick = async () => {
  await renderRanking();
  showScreen("screen-ranking");
};

document.getElementById("btn-back-ranking").onclick = () => {
  showScreen("screen-start");
};

afterLogin().catch((error) => {
  authMessage.innerText = `Error al restaurar sesion: ${toMessage(error)}`;
});

handleRecoveryFlow().catch((error) => {
  authMessage.innerText = `Error en recuperacion: ${toMessage(error)}`;
});

modeSqlBtn.onclick = () => {
  setMode("sql");
  updateModeUI();
};

modeJsBtn.onclick = () => {
  setMode("js");
  updateModeUI();
};

updateModeUI();

function toMessage(error) {
  if (!error) return "Error desconocido.";
  if (typeof error === "string") return error;
  if (error.message) return error.message;
  return "Error desconocido.";
}

async function handleRecoveryFlow() {
  const url = new URL(window.location.href);
  const hash = window.location.hash || "";
  const isRecovery =
    url.searchParams.get("type") === "recovery" ||
    hash.includes("type=recovery");

  if (!isRecovery) return;

  showScreen("screen-auth");
  authMessage.innerText = "Enlace de recuperacion detectado. Define una nueva contrasena.";

  const newPassword = window.prompt("Nueva contrasena (minimo 6 caracteres):", "");
  if (!newPassword) {
    authMessage.innerText = "Recuperacion cancelada. Puedes volver a usar el enlace del email.";
    clearRecoveryUrl();
    return;
  }

  if (newPassword.length < 6) {
    authMessage.innerText = "La nueva contrasena debe tener al menos 6 caracteres.";
    clearRecoveryUrl();
    return;
  }

  const { error } = await updatePassword(newPassword);
  if (error) {
    authMessage.innerText = error.message;
    clearRecoveryUrl();
    return;
  }

  authMessage.innerText = "Contrasena actualizada. Ahora inicia sesion.";
  clearRecoveryUrl();
}

function clearRecoveryUrl() {
  window.history.replaceState({}, document.title, window.location.pathname);
}

function updateModeUI() {
  const mode = getMode();
  if (mode === "sql") {
    startTitle.textContent = "SQL MIND TRAINER";
    startSubtitle.textContent = "Entrena tu mente. Domina SQL.";
    modeSqlBtn.classList.remove("secondary");
    modeJsBtn.classList.add("secondary");
  } else {
    startTitle.textContent = "JAVASCRIPT MIND TRAINER";
    startSubtitle.textContent = "Aprende sintaxis, logica y funciones JavaScript.";
    modeSqlBtn.classList.add("secondary");
    modeJsBtn.classList.remove("secondary");
  }
}
