// =====================================================
// Achievements system
// =====================================================

import { getProgress } from "../supabase.js";

const achievements = [
  {
    id: 1,
    title: "Primer Paso",
    description: "Completa tu primer desafio.",
    condition: (p) => p.max_level >= 2,
  },
  {
    id: 2,
    title: "Aprendiz de SQL",
    description: "Llega al nivel 10.",
    condition: (p) => p.max_level >= 10,
  },
  {
    id: 3,
    title: "Dominio Intermedio",
    description: "Llega al nivel 25.",
    condition: (p) => p.max_level >= 25,
  },
  {
    id: 4,
    title: "SQL Master",
    description: "Completa 50 niveles.",
    condition: (p) => p.max_level >= 50,
  },
];

export async function computeAchievements() {
  const container = document.getElementById("achievements-container");
  try {
    const progress = await getProgress();
    if (!progress) {
      container.replaceChildren();
      return;
    }

    container.replaceChildren();

    achievements.forEach((achievement) => {
      const unlocked = achievement.condition(progress);

      const card = document.createElement("div");
      card.classList.add("achievement");

      const icon = document.createElement("img");
      icon.className = "achievement-icon";
      icon.src = `./assets/badges/${achievement.id}.png`;
      icon.alt = achievement.title;

      const body = document.createElement("div");

      const title = document.createElement("div");
      title.className = "achievement-title";
      title.textContent = achievement.title;

      const description = document.createElement("div");
      description.className = "achievement-desc";
      description.textContent = achievement.description;

      const state = document.createElement("div");
      state.style.marginTop = "5px";
      state.style.color = unlocked ? "#00ff88" : "#888";
      state.textContent = unlocked ? "Logro desbloqueado" : "Bloqueado";

      body.append(title, description, state);
      card.append(icon, body);
      container.appendChild(card);
    });
  } catch (error) {
    const message = document.createElement("p");
    message.className = "subtitle";
    message.textContent = `No se pudieron cargar logros: ${error.message || error}`;
    container.replaceChildren(message);
  }
}
