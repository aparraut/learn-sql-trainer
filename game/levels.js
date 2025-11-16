// ==========================================
// 🎮 Niveles
// ==========================================
import { renderTablePreview } from "./table-preview.js";
import { showScreen } from "../ui/screens.js";
import { executeSQL } from "../sql/sql-engine.js";
import { getProgress, saveProgress } from "../supabase.js";

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

    document.getElementById('challenge-title').innerText = `Desafío ${lvl.id}`;
    document.getElementById('challenge-description').innerText = lvl.description;
    document.getElementById('hint-text').innerText = lvl.hint;
    document.getElementById('hint-text').classList.add("hidden");
    document.getElementById('feedback').innerText = "";
    // Insertar preview de tabla
    document.getElementById('table-preview').innerHTML = renderTablePreview(lvl.table);

    document.getElementById('btn-next-level').onclick = goToNextLevel;


    document.getElementById('sql-input').value = "";
    document.getElementById('result-table').innerHTML = "";
    document.getElementById('btn-next-level').classList.add("hidden");

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

    renderTable(result);

    if (correct) {
        document.getElementById('feedback').innerText = "✅ ¡Correcto!";
        document.getElementById('btn-next-level').classList.remove("hidden");

        const progress = await getProgress();
        await saveProgress(Math.max(progress.max_level, currentLevel + 1), progress.total_score + 10);

    } else {
        document.getElementById('feedback').innerText = "❌ Incorrecto";
    }
}

// ===============================
// 📊 Render table
// ===============================
function renderTable(rows) {
    const container = document.getElementById("result-table");
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

    // Ocultar el botón de siguiente nivel
    document.getElementById("btn-next-level").classList.add("hidden");

    // Limpiar UI
    document.getElementById("feedback").innerText = "";
    document.getElementById("result-table").innerHTML = "";
    document.getElementById("sql-input").value = "";

    // Cargar siguiente nivel
    startLevel(currentLevel);
}




