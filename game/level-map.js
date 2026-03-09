// =====================================================
// Mapa de niveles
// =====================================================

import { startLevel } from "./levels.js";
import { getProgress } from "../supabase.js";

let levels = [];

async function ensureLevelsLoaded() {
  if (levels.length > 0) return;

  try {
    const res = await fetch("./data/levels.json");
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    levels = await res.json();
  } catch (error) {
    throw new Error(`No se pudieron cargar los niveles: ${error.message || error}`);
  }
}

export async function renderLevelMap() {
  const container = document.getElementById("levels-container");
  const loader = document.createElement("div");
  loader.className = "level-map-loader";
  loader.textContent = "Cargando niveles";
  container.replaceChildren(loader);

  try {
    await ensureLevelsLoaded();

    const progress = await getProgress();
    const maxUnlocked = progress?.max_level || 1;

    const groups = {};
    levels.forEach((level) => {
      if (!groups[level.groupName]) groups[level.groupName] = [];
      groups[level.groupName].push(level);
    });

    container.replaceChildren();

    Object.keys(groups).forEach((groupName) => {
      const title = document.createElement("div");
      title.classList.add("level-row-title");
      title.innerText = groupName;

      const row = document.createElement("div");
      row.classList.add("level-row");

      groups[groupName].forEach((level) => {
        const btn = document.createElement("div");
        btn.classList.add("level-btn");
        btn.innerText = String(level.id);

        const short = level.description.length > 35
          ? `${level.description.slice(0, 35)}...`
          : level.description;
        btn.setAttribute("data-tooltip", short);

        if (level.id < maxUnlocked) {
          btn.classList.add("completed");
        } else if (level.id === maxUnlocked) {
          btn.classList.add("available");
        } else {
          btn.classList.add("locked");
        }

        if (level.id <= maxUnlocked) {
          btn.onclick = () => startLevel(level.id);
        }

        row.appendChild(btn);
      });

      container.append(title, row);
    });
  } catch (error) {
    const message = document.createElement("p");
    message.className = "subtitle";
    message.textContent = `No se pudo cargar el mapa: ${error.message || error}`;
    container.replaceChildren(message);
  }
}
