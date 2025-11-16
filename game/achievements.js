// =====================================================
// 🏆 ACHIEVEMENTS SYSTEM
// =====================================================

import { getProgress } from "../supabase.js";

let achievements = [
  {
    id: 1,
    title: "Primer Paso",
    description: "Completa tu primer desafío.",
    condition: p => p.max_level >= 2
  },
  {
    id: 2,
    title: "Aprendiz de SQL",
    description: "Llega al nivel 10.",
    condition: p => p.max_level >= 10
  },
  {
    id: 3,
    title: "Dominio Intermedio",
    description: "Llega al nivel 25.",
    condition: p => p.max_level >= 25
  },
  {
    id: 4,
    title: "SQL Master",
    description: "Completa 50 niveles.",
    condition: p => p.max_level >= 50
  }
];

export async function computeAchievements() {
  const progress = await getProgress();
  if (!progress) return;

  const container = document.getElementById("achievements-container");
  container.innerHTML = "";

  achievements.forEach(a => {
    const unlocked = a.condition(progress);

    const div = document.createElement("div");
    div.classList.add("achievement");

    div.innerHTML = `
      <img class="achievement-icon" src="./assets/badges/${a.id}.png" />
      <div>
        <div class="achievement-title">${a.title}</div>
        <div class="achievement-desc">${a.description}</div>
        <div style="margin-top:5px; color:${unlocked ? '#00ff88' : '#888'};">
          ${unlocked ? "✔ Logro desbloqueado" : "🔒 Bloqueado"}
        </div>
      </div>
    `;

    container.appendChild(div);
  });
}
