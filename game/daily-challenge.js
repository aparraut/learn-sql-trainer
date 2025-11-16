// =====================================================
// 📆 Daily Challenge
// =====================================================

import { startLevel } from "./levels.js";
import { getProgress, saveProgress } from "../supabase.js";

export async function loadDailyChallenge() {
  const last = localStorage.getItem("daily_date");
  const today = new Date().toISOString().slice(0, 10);

  const btn = document.createElement("button");
  btn.classList.add("btn", "secondary");
  btn.innerText = "🔥 Desafío Diario";

  btn.onclick = () => startDaily();

  document.getElementById("screen-start").appendChild(btn);

  if (last === today) {
    btn.innerText = "🎉 Ya completaste el desafío diario hoy";
    btn.disabled = true;
  }
}

async function startDaily() {
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem("daily_date", today);

  // Nivel aleatorio
  const level = Math.floor(Math.random() * 20) + 1;

  // Bonus de puntos
  const progress = await getProgress();
  await saveProgress(progress.max_level, progress.total_score + 20);

  startLevel(level);
}
