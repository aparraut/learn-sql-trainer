// ==============================================
// 🧠 SQL Mind Trainer 2.0 - MAIN
// ==============================================

import { loadTablesData } from "./sql/sql-engine.js";
import { initSupabase, login, register, logout, getCurrentUser } from './supabase.js';
import { showScreen } from './ui/screens.js';
import { loadLevels, startLevel } from './game/levels.js';
import { renderLevelMap } from './game/level-map.js';
import { loadProgress } from './game/progress.js';
import { computeAchievements } from './game/achievements.js';
import { checkAnswer } from './game/levels.js';
import { renderRanking } from "./game/ranking.js";
import { ensureProgressRow } from "./supabase.js";
// Init Supabase Client
initSupabase();

// ================================
// 🔐 AUTH EVENTOS
// ================================
document.getElementById('btn-login').onclick = async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  const { error } = await login(email, password);
  const msg = document.getElementById('auth-message');

  if (error) {
    msg.innerText = error.message;
    return;
  }

  await afterLogin();
};

document.getElementById('btn-register').onclick = async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  const { error } = await register(email, password);
  const msg = document.getElementById('auth-message');

  if (error) {
    msg.innerText = error.message;
    return;
  }

  msg.innerText = "Cuenta creada. Revisa tu email.";
};

// ================================
// 🔌 Evento Logout
// ================================
document.getElementById('btn-logout').onclick = async () => {
  await logout();
  showScreen("screen-auth");
};

// ================================
// 🧭 Start / Map
// ================================
document.getElementById('btn-start').onclick = () => {
  startLevel(1);
};

document.getElementById('btn-levels').onclick = () => {
  renderLevelMap();
  showScreen("screen-levels");
};

document.getElementById('btn-back-levels').onclick = () => {
  showScreen("screen-start");
};

document.getElementById('btn-back-game').onclick = () => {
  renderLevelMap();
  showScreen("screen-levels");
};

// ================================
// 🎮 Post-login flow
// ================================
async function afterLogin() {
  const user = await getCurrentUser();

  if (!user) {
    showScreen("screen-auth");
    return;
  }

  // 🛠 Crear progreso si falta
  await ensureProgressRow();
  await loadTablesData();
  // 🔥 AHORA sí cargamos todo
  await loadLevels();
  await loadProgress();
  await computeAchievements();

  showScreen("screen-start");
}



document.getElementById("btn-run").onclick = () => checkAnswer(false);

document.getElementById("btn-achievements").onclick = async () => {
  await computeAchievements();
  showScreen("screen-achievements");
};

document.getElementById("btn-back-achievements").onclick = () => {
  showScreen("screen-start");
};


//ranking global

document.getElementById("btn-ranking").onclick = async () => {
  await renderRanking();
  showScreen("screen-ranking");
};

document.getElementById("btn-back-ranking").onclick = () => {
  showScreen("screen-start");
};

// Auto-login on refresh
afterLogin();
