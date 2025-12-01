// ==========================================
// 🎮 Niveles
// ==========================================
import { renderTablePreview } from "./table-preview.js";
import { showScreen } from "../ui/screens.js";
import { executeSQL } from "../sql/sql-engine.js";
import { getProgress, saveProgress, upsertRanking } from "../supabase.js";

let levels = [];
let currentLevel = 1;
let timer = null;

// ===============================
// 📦 Cargar levels.json
// ===============================
export async function loadLevels() {
    const res = await fetch("./data/levels.json");
    levels = await res.json();
}

// ===============================
// 🚀 Start a level
// ===============================
export async function startLevel(id) {
    currentLevel = id;

    const progress = await getProgress();
    const score = progress?.total_score ?? 0;
    document.getElementById("score").innerText = `Puntos: ${score}`;

    const lvl = levels[id - 1];

    // Info de nivel
    const info = document.getElementById("level-info");
    info.innerHTML = `
    <div style="
      font-size:13px;
      color:#d4ffe4;
      text-align:center;
      letter-spacing:0.2px;
      margin-bottom:4px;
    ">
      <span style="color:#00ff88; font-weight:600;">
        ${lvl.groupName}
      </span>
      · 🎯 Dificultad: ${lvl.difficulty}/10
      · ⏱ Tiempo: ${lvl.timeLimit}s
      · ⭐ Recompensa: ${lvl.reward} pts
    </div>
  `;

    document.getElementById("challenge-title").innerText = `Desafío ${lvl.id}`;
    document.getElementById("challenge-description").innerText = lvl.description;
    document.getElementById("hint-text").innerText = lvl.hint;
    document.getElementById("hint-text").classList.add("hidden");
    document.getElementById("feedback").innerText = "";

    // Preview de tabla
    document.getElementById("table-preview").innerHTML = renderTablePreview(lvl.table);

    // Reset input y resultados
    document.getElementById("sql-input").value = "";
    document.getElementById("result-table").innerHTML = "";
    document.getElementById("result-table").style.display = "none";
    const header = document.getElementById("result-header");
    if (header) header.style.display = "none";

    const hidden = document.getElementById("hidden-result");
    if (hidden) hidden.innerHTML = "";

    startTimer(lvl.timeLimit || 60);
    showScreen("screen-game");
}

// ===============================
// ⏱ Timer
// ===============================
function startTimer(seconds) {
    clearInterval(timer);
    let t = seconds;

    timer = setInterval(() => {
        document.getElementById("timer").innerText = `⏱ ${t}s`;
        t--;

        if (t < 0) {
            clearInterval(timer);
            checkAnswer(true);
        }
    }, 1000);
}

// ===============================
// 🔍 Evaluar respuesta
// ===============================
export async function checkAnswer(timeout = false) {
    clearInterval(timer);

    const lvl = levels[currentLevel - 1];
    const input = document.getElementById("sql-input").value.trim();

    if (!input && timeout) {
        document.getElementById("feedback").innerText = "⏰ Tiempo agotado";
        return;
    }

    const result = executeSQL(input);
    const expected = executeSQL(lvl.solution);
    const correct = JSON.stringify(result) === JSON.stringify(expected);

    // Siempre generamos la tabla en el contenedor oculto
    renderTable(result);

    if (correct) {
        // 🔊 SONIDO DE VICTORIA **ANTES** de cualquier await
        const sfx = document.getElementById("sfx-victory");
        if (sfx) {
            sfx.currentTime = 0;
            sfx.play().catch(() => { });
        }

        // Luego ya podemos hacer cosas async tranquilos
        const progress = await getProgress();
        const reward = lvl.reward ?? 10;
        const newMaxLevel = Math.max(progress.max_level, currentLevel + 1);
        const newScore = progress.total_score + reward;

        await saveProgress(newMaxLevel, newScore);
        await upsertRanking(newScore);

        // Ocultar resultado en la game screen
        const header = document.getElementById("result-header");
        if (header) header.style.display = "none";
        document.getElementById("result-table").style.display = "none";

        // Mostrar modal con la tabla (copiada desde hidden-result)
        showWinModal(lvl, newScore);

    } else {
        document.getElementById("feedback").innerText = "❌ Incorrecto";

        // 🔊 Sonido de error (aquí nunca tuvimos problema)
        const snd = document.getElementById("sfx-error");
        if (snd) {
            snd.currentTime = 0;
            snd.play().catch(() => { });
        }

        // Copiar tabla desde el contenedor oculto al visible
        const hidden = document.getElementById("hidden-result");
        const visible = document.getElementById("result-table");
        visible.innerHTML = hidden ? hidden.innerHTML : "";
        visible.style.display = "block";

        const header = document.getElementById("result-header");
        if (header) header.style.display = "block";
    }
}


// ===============================
// 📊 Render table (en contenedor oculto)
// ===============================
function renderTable(rows) {
    const container = document.getElementById("hidden-result");
    if (!container) return;

    // Si es un error del motor, mostrarlo
    if (rows && rows[0] && rows[0].error) {
        container.innerHTML = `
      <p style="color:#ff3366; font-weight:bold;">
        ${rows[0].error}
      </p>
    `;
        return;
    }

    // Si está vacío realmente
    if (!rows || rows.length === 0) {
        container.innerHTML = "<p>Sin resultados.</p>";
        return;
    }

    const headers = Object.keys(rows[0]);
    let html = "<table><thead><tr>";

    headers.forEach(h => (html += `<th>${h}</th>`));
    html += "</tr></thead><tbody>";

    rows.forEach(r => {
        html += "<tr>";
        headers.forEach(h => (html += `<td>${r[h]}</td>`));
        html += "</tr>";
    });

    html += "</tbody></table>";

    container.innerHTML = html;
}

// ===============================
// 📊 Go to next level
// ===============================
function goToNextLevel() {
    currentLevel++;

    if (currentLevel > levels.length) {
        alert("🎉 ¡Has completado todos los niveles!");
        return;
    }

    startLevel(currentLevel);
}

// ===============================
// 🏆 Modal de victoria
// ===============================
function showWinModal(lvl, newScore) {
    const win = document.getElementById("win-modal");
    if (!win) return;

    // Mostrar modal INMEDIATO
    win.classList.remove("hidden");

    // Tiempo restante
    const timeLeft = document
        .getElementById("timer")
        .innerText.replace("⏱ ", "");
    document.getElementById("win-time").innerText =
        "⏱ Tiempo restante: " + timeLeft;

    // Recompensa
    document.getElementById("win-reward").innerText =
        `⭐ Puntos obtenidos: +${lvl.reward}`;

    // Total acumulado
    document.getElementById("win-total").innerText =
        `💚 Total acumulado: ${newScore} pts`;

    // Copiar tabla desde el contenedor oculto al modal
    const hidden = document.getElementById("hidden-result");
    const winTable = document.getElementById("win-result-table");
    winTable.innerHTML = hidden ? hidden.innerHTML : "";

    // Animación secuencial de filas
    const rows = document.querySelectorAll("#win-result-table tr");
    rows.forEach((row, i) => {
        row.style.animationDelay = `${i * 0.03}s`;
    });

    // Botón siguiente nivel
    document.getElementById("win-next").onclick = () => {
        win.classList.add("hidden");
        goToNextLevel();
    };
}
