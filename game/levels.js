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
    document.getElementById("score").innerText = `Puntos: ${progress.total_score}`;
    const lvl = levels[id - 1];

    // Información del nivel
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

    document.getElementById('challenge-title').innerText = `Desafío ${lvl.id}`;
    document.getElementById('challenge-description').innerText = lvl.description;
    document.getElementById('hint-text').innerText = lvl.hint;
    document.getElementById('hint-text').classList.add("hidden");
    document.getElementById('feedback').innerText = "";

    // Insertar preview de tabla
    document.getElementById('table-preview').innerHTML = renderTablePreview(lvl.table);

    document.getElementById('sql-input').value = "";

    // Reset tabla del resultado (OCULTA)
    document.getElementById("result-table").innerHTML = "";
    document.getElementById("result-table").style.display = "none";
    document.getElementById("result-header").style.display = "none";


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
        document.getElementById('timer').innerText = `⏱ ${t}s`;
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

    // 🔥 SIEMPRE generamos la tabla (aunque quede oculta)
    renderTable(result);

    if (correct) {

        const progress = await getProgress();
        const reward = lvl.reward ?? 10;
        const newMaxLevel = Math.max(progress.max_level, currentLevel + 1);
        const newScore = progress.total_score + reward;

        await saveProgress(newMaxLevel, newScore);
        await upsertRanking(newScore);

        // Sonido victoria
        document.getElementById("sfx-victory").currentTime = 0;
        document.getElementById("sfx-victory").play().catch(() => { });

        // Asegurar que la tabla NO se vea afuera
        document.getElementById("result-table").style.display = "none";

        document.getElementById("result-header").style.display = "none";


        // Mostrar modal
        showWinModal(lvl, newScore);

    } else {

        // Feedback incorrecto
        document.getElementById('feedback').innerText = "❌ Incorrecto";

        // Sonido error
        const snd = document.getElementById("sfx-error");
        snd.currentTime = 0;
        snd.play().catch(() => { });

        // Renderizar tabla SOLO si es incorrecto
        renderTable(result);
        document.getElementById("result-table").innerHTML =
            document.getElementById("hidden-result").innerHTML;
        document.getElementById("result-header").style.display = "block";

        document.getElementById("result-table").style.display = "block";
    }


    // ===============================
    // 📊 Render table
    // ===============================
    function renderTable(rows) {
        const container = document.getElementById("hidden-result");

        if (rows && rows[0] && rows[0].error) {
            container.innerHTML = `<p style="color:#ff3366; font-weight:bold;">${rows[0].error}</p>`;
            return;
        }

        if (!rows || rows.length === 0) {
            container.innerHTML = "<p>Sin resultados.</p>";
            return;
        }

        const headers = Object.keys(rows[0]);
        let html = "<table><thead><tr>";

        headers.forEach(h => html += `<th>${h}</th>`);
        html += "</tr></thead><tbody>";

        rows.forEach(r => {
            html += "<tr>";
            headers.forEach(h => html += `<td>${r[h]}</td>`);
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

        // Limpiar
        document.getElementById("result-table").innerHTML = "";
        document.getElementById("result-table").style.display = "none";
        document.getElementById("sql-input").value = "";

        startLevel(currentLevel);
    }

    // ===============================
    // 🏆 Modal de victoria
    // ===============================
    function showWinModal(lvl, newScore) {
        const win = document.getElementById("win-modal");

        // Mostrar modal INMEDIATAMENTE
        win.classList.remove("hidden");

        // Tiempo
        const timeLeft = document.getElementById("timer").innerText.replace("⏱ ", "");
        document.getElementById("win-time").innerText = "⏱ Tiempo restante: " + timeLeft;

        // Recompensa
        document.getElementById("win-reward").innerText = `⭐ Puntos obtenidos: +${lvl.reward}`;

        // Total acumulado correcto
        document.getElementById("win-total").innerText =
            `💚 Total acumulado: ${newScore} pts`;

        // Copiar tabla al modal
        const original = document.getElementById("hidden-result").innerHTML;
        document.getElementById("win-result-table").innerHTML = original;

        // Animación secuencial (más rápida)
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
}
