// =====================================================
// 🗺️ MAPA DE NIVELES 2.0
// =====================================================

import { loadLevels, startLevel } from "./levels.js";
import { getProgress } from "../supabase.js";

let levels = [];

// Cargar levels.json una sola vez
async function ensureLevelsLoaded() {
  if (levels.length === 0) {
    const res = await fetch("./data/levels.json");
    levels = await res.json();
  }
}

export async function renderLevelMap() {
  await ensureLevelsLoaded();

  const container = document.getElementById("levels-container");
  container.innerHTML = `
  <div class="level-map-loader">Cargando niveles</div>
`;


  const progress = await getProgress();
  const maxUnlocked = progress?.max_level || 1;

  // Agrupar por groupName
  const groups = {};
  levels.forEach(lvl => {
    if (!groups[lvl.groupName]) groups[lvl.groupName] = [];
    groups[lvl.groupName].push(lvl);
  });

  // Render
  container.innerHTML = "";  // ← borra el loader al empezar a renderizar

  for (const groupName in groups) {
    const title = document.createElement("div");
    title.classList.add("level-row-title");
    title.innerText = groupName;

    const row = document.createElement("div");
    row.classList.add("level-row");

    groups[groupName].forEach(level => {
      const btn = document.createElement("div");
      btn.classList.add("level-btn");

      btn.innerText = level.id;

      const short = level.description.length > 35
        ? level.description.slice(0, 35) + "…"
        : level.description;

      btn.setAttribute("data-tooltip", short);


      // Estado
      if (level.id < maxUnlocked) {
        btn.classList.add("completed");
      } else if (level.id === maxUnlocked) {
        btn.classList.add("available");
      } else {
        btn.classList.add("locked");
      }

      // Acción
      if (level.id <= maxUnlocked) {
        btn.onclick = () => startLevel(level.id);
      }

      row.appendChild(btn);
    });

    container.appendChild(title);
    container.appendChild(row);
  }
}
