// ==============================================
// SQL Mind Trainer 2.0 - MAIN
// ==============================================

import { loadTablesData } from "./sql/sql-engine.js";
import {
  initSupabase,
  login,
  register,
  logout,
  getCurrentUser,
  ensureProgressRow,
} from "./supabase.js";
import { showScreen } from "./ui/screens.js";
import { loadLevels, startLevel, checkAnswer } from "./game/levels.js";
import { renderLevelMap } from "./game/level-map.js";
import { loadProgress } from "./game/progress.js";
import { computeAchievements } from "./game/achievements.js";
import { renderRanking } from "./game/ranking.js";

initSupabase();

const authMessage = document.getElementById("auth-message");

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
  startLevel(1);
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
    await loadProgress();
    await computeAchievements();

    showScreen("screen-start");
  } catch (error) {
    authMessage.innerText = `Error al cargar datos: ${toMessage(error)}`;
    showScreen("screen-auth");
  }
}

document.getElementById("btn-run").onclick = () => checkAnswer(false);

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

function toMessage(error) {
  if (!error) return "Error desconocido.";
  if (typeof error === "string") return error;
  if (error.message) return error.message;
  return "Error desconocido.";
}
