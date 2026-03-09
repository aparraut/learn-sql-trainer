import { startLevel } from "./levels.js";
import { startJsLevel, getJsLevels, getJsProgress, loadJsLevels } from "./js-levels.js";
import { getProgress } from "../supabase.js";
import { getMode, isSqlMode } from "./mode.js";

let sqlLevels = [];

async function ensureSqlLevelsLoaded() {
  if (sqlLevels.length > 0) return;
  const res = await fetch("./data/levels.json");
  if (!res.ok) throw new Error(`No se pudieron cargar niveles SQL (HTTP ${res.status})`);
  sqlLevels = await res.json();
}

async function getMapContext() {
  if (isSqlMode()) {
    await ensureSqlLevelsLoaded();
    const progress = await getProgress();
    return {
      levels: sqlLevels,
      maxUnlocked: progress?.max_level || 1,
      modeLabel: "SQL",
      startFn: startLevel,
    };
  }

  await loadJsLevels();
  const jsProgress = getJsProgress();
  return {
    levels: getJsLevels(),
    maxUnlocked: jsProgress.max_level || 1,
    modeLabel: "JavaScript",
    startFn: startJsLevel,
  };
}

export async function renderLevelMap() {
  const container = document.getElementById("levels-container");
  const loader = document.createElement("div");
  loader.className = "level-map-loader";
  loader.textContent = "Cargando niveles";
  container.replaceChildren(loader);

  try {
    const { levels, maxUnlocked, modeLabel, startFn } = await getMapContext();
    const groups = {};

    levels.forEach((level) => {
      if (!groups[level.groupName]) groups[level.groupName] = [];
      groups[level.groupName].push(level);
    });

    container.replaceChildren();

    const subtitle = document.createElement("div");
    subtitle.className = "subtitle";
    subtitle.textContent = `Modo actual: ${modeLabel}`;
    container.appendChild(subtitle);

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

        if (level.id < maxUnlocked) btn.classList.add("completed");
        else if (level.id === maxUnlocked) btn.classList.add("available");
        else btn.classList.add("locked");

        if (level.id <= maxUnlocked) {
          btn.onclick = () => startFn(level.id);
        }

        row.appendChild(btn);
      });

      container.append(title, row);
    });
  } catch (error) {
    const message = document.createElement("p");
    message.className = "subtitle";
    message.textContent = `No se pudo cargar el mapa (${getMode()}): ${error.message || error}`;
    container.replaceChildren(message);
  }
}
