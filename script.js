let levels = [];
let tables = {};
let currentLevel = 0;
let score = 0;
let timer = 60;
let countdown;

async function loadData() {
  const [levelsRes, tablesRes] = await Promise.all([
    fetch('data/levels.json'),
    fetch('data/tables.json')
  ]);
  levels = await levelsRes.json();
  tables = await tablesRes.json();
}

function startGame() {
  document.getElementById('start-screen').classList.remove('active');
  document.getElementById('game-screen').classList.add('active');
  score = 0;
  currentLevel = 0;
  startLevel();
}

function startLevel() {
  const level = levels[currentLevel];
  document.getElementById('challenge-title').innerText = `Desafío ${level.id}`;
  document.getElementById('challenge-description').innerText = level.description;
  document.getElementById('sql-input').value = '';
  document.getElementById('feedback').innerText = '';
  document.getElementById('result-table').innerHTML = '';
  document.getElementById('score').innerText = `Puntos: ${score}`;

  // ocultar botón siguiente nivel
  document.getElementById('next-level-btn').style.display = 'none';

  // Quitar colores previos
  document.body.classList.remove('success', 'error');

  // Renderizar tabla previa
  const tablePreviewDiv = document.getElementById('table-preview');
  tablePreviewDiv.innerHTML = renderTablePreview(level.table);

  const toggleBtn = document.getElementById('toggle-table-btn');
  const tableContent = document.getElementById('table-content');
  tableContent.style.display = 'none';
  toggleBtn.innerText = '👁️ Mostrar tabla';
  toggleBtn.onclick = () => {
    if (tableContent.style.display === 'none') {
      tableContent.style.display = 'block';
      toggleBtn.innerText = '🙈 Ocultar tabla';
    } else {
      tableContent.style.display = 'none';
      toggleBtn.innerText = '👁️ Mostrar tabla';
    }
  };

  timer = 60;
  clearInterval(countdown);
  countdown = setInterval(() => {
    document.getElementById('timer').innerText = `⏱️ ${timer--}s`;
    if (timer < 0) checkAnswer();
  }, 1000);
}

function normalizeSQL(str) {
  return str.toLowerCase().replace(/\s+/g, ' ').replace(/;$/, '').trim();
}

function checkAnswer() {
  clearInterval(countdown);
  const userQuery = normalizeSQL(document.getElementById('sql-input').value);
  const level = levels[currentLevel];
  const expected = normalizeSQL(level.expected);

  const feedback = document.getElementById('feedback');
  const resultArea = document.getElementById('result-table');

  const simulatedResult = executeQuery(userQuery, tables);
  const expectedResult = executeQuery(expected, tables);

  const isCorrect =
    userQuery === expected ||
    JSON.stringify(simulatedResult) === JSON.stringify(expectedResult);

  if (isCorrect) {
    score += Math.max(10, timer);
    feedback.innerText = '✅ ¡Correcto! Bien hecho.';
    document.getElementById('score').innerText = `Puntos: ${score}`;
    resultArea.innerHTML = renderTable(simulatedResult);

    // ✅ Efecto verde
    document.body.classList.add('success');
    setTimeout(() => document.body.classList.remove('success'), 800);

    // Mostrar botón siguiente nivel
    document.getElementById('next-level-btn').style.display = 'inline-block';
  } else {
    feedback.innerText = '❌ Incorrecto. Revisa tu consulta.';
    resultArea.innerHTML = renderTable(simulatedResult);

    // ❌ Efecto rojo
    document.body.classList.add('error');
    setTimeout(() => document.body.classList.remove('error'), 800);
  }
}

/* =====================================================
   🧮  Motor SQL
   ===================================================== */
function executeQuery(query, tables) {
  try {
    query = query.replace(/\s+/g, ' ').trim();

    // JOIN
    if (query.includes('join')) {
      const joinRegex =
        /select\s+(.*?)\s+from\s+(\w+)\s+join\s+(\w+)\s+on\s+(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+);?/i;
      const m = query.match(joinRegex);
      if (!m) return [];
      const [, selectFields, t1, t2, , leftK, , rightK] = m;

      const tableA = tables[t1];
      const tableB = tables[t2];
      if (!tableA || !tableB) return [];

      const joined = [];
      for (const a of tableA) {
        for (const b of tableB) {
          if (a[leftK] === b[rightK]) joined.push({ ...a, ...b });
        }
      }

      const fields = selectFields.split(',').map(f => f.trim());
      return joined.map(row => {
        const newRow = {};
        fields.forEach(f => {
          const parts = f.split('.');
          const key = parts.length === 2 ? parts[1] : parts[0];
          newRow[key] = row[key];
        });
        return newRow;
      });
    }

    // SELECT general
    const selectRegex =
      /select\s+(.*?)\s+from\s+(\w+)(?:\s+where\s+(.*?))?(?:\s+order\s+by\s+(\w+)\s+(asc|desc))?(?:\s+limit\s+(\d+))?;?$/i;
    const m = query.match(selectRegex);
    if (!m) return [];

    const [, selectFields, tableName, whereClause, orderField, orderDir, limitValue] = m;
    let data = tables[tableName];
    if (!data) return [];

    if (whereClause) data = applyWhere(data, whereClause);

    if (orderField) {
      data.sort((a, b) => {
        const valA = a[orderField];
        const valB = b[orderField];
        if (valA < valB) return orderDir === 'desc' ? 1 : -1;
        if (valA > valB) return orderDir === 'desc' ? -1 : 1;
        return 0;
      });
    }

    if (limitValue) data = data.slice(0, Number(limitValue));

    if (selectFields.includes('count(*)')) return [{ count: data.length }];

    let fields =
      selectFields.trim() === '*' ? Object.keys(data[0]) : selectFields.split(',').map(f => f.trim());
    return data.map(row => {
      const newRow = {};
      fields.forEach(f => (newRow[f] = row[f]));
      return newRow;
    });
  } catch {
    return [];
  }
}

function applyWhere(data, whereClause) {
  const parts = whereClause.split(/\s+or\s+/i);
  return data.filter(row => {
    return parts.some(condition => {
      const likeMatch = condition.match(/(\w+)\s+like\s+'(.*)'/i);
      if (likeMatch) {
        const [, field, pattern] = likeMatch;
        const regex = new RegExp('^' + pattern.replace('%', '.*') + '$', 'i');
        return regex.test(row[field]);
      }

      const match = condition.match(/(\w+)\s*([><=]+)\s*'?([\w\s]+)'?/);
      if (!match) return false;
      const [, field, op, valueRaw] = match;
      const value = isNaN(valueRaw) ? valueRaw.toLowerCase() : Number(valueRaw);

      switch (op) {
        case '>': return row[field] > value;
        case '<': return row[field] < value;
        case '=': return String(row[field]).toLowerCase() === String(value);
        default: return false;
      }
    });
  });
}

/* =====================================================
   👁️ Vista previa de tablas con toggle
   ===================================================== */
function renderTablePreview(tableField) {
  let html = `
    <div class="table-header">
      <button id="toggle-table-btn">👁️ Mostrar tabla</button>
    </div>
    <div id="table-content">
  `;

  if (tableField === 'join_example') {
    html += '<h4>users</h4>' + renderTable(tables.users);
    html += '<h4>orders</h4>' + renderTable(tables.orders);
  } else if (tables[tableField]) {
    html += `<h4>${tableField}</h4>` + renderTable(tables[tableField]);
  } else {
    html += '<p>No se encontró tabla asociada.</p>';
  }

  html += '</div>';
  return html;
}

function renderTable(rows) {
  if (!rows || rows.length === 0) return '<p>Sin resultados.</p>';
  const headers = Object.keys(rows[0]);
  let html = '<table><thead><tr>';
  headers.forEach(h => (html += `<th>${h}</th>`));
  html += '</tr></thead><tbody>';
  rows.forEach(r => {
    html += '<tr>';
    headers.forEach(h => (html += `<td>${r[h]}</td>`));
    html += '</tr>';
  });
  html += '</tbody></table>';
  return html;
}

/* =====================================================
   🏆 Ranking
   ===================================================== */
function endGame() {
  document.getElementById('game-screen').classList.remove('active');
  document.getElementById('end-screen').classList.add('active');
  document.getElementById('final-score').innerText = `Tu puntuación final: ${score} puntos`;

  saveScore(score);

  const rankingDiv = document.createElement('div');
  rankingDiv.innerHTML = renderRanking();
  document.getElementById('end-screen').appendChild(rankingDiv);
}

function saveScore(score) {
  const records = JSON.parse(localStorage.getItem('sql_scores') || '[]');
  const date = new Date().toLocaleDateString();
  records.push({ score, date });
  const top5 = records.sort((a, b) => b.score - a.score).slice(0, 5);
  localStorage.setItem('sql_scores', JSON.stringify(top5));
}

function renderRanking() {
  const records = JSON.parse(localStorage.getItem('sql_scores') || '[]');
  if (records.length === 0) return '<p>No hay récords guardados aún.</p>';

  let html = `<h3>🏆 Mejores puntuaciones</h3><table><thead><tr><th>Fecha</th><th>Puntos</th></tr></thead><tbody>`;
  records.forEach(r => (html += `<tr><td>${r.date}</td><td>${r.score}</td></tr>`));
  html += '</tbody></table>';
  return html;
}

function nextLevel() {
  currentLevel++;
  if (currentLevel >= levels.length) endGame();
  else startLevel();
}

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('run-query').addEventListener('click', checkAnswer);
document.getElementById('next-level-btn').addEventListener('click', nextLevel);
document.getElementById('retry-btn').addEventListener('click', () => {
  document.getElementById('end-screen').classList.remove('active');
  document.getElementById('start-screen').classList.add('active');
  const oldRank = document.querySelector('#end-screen div');
  if (oldRank) oldRank.remove();
});

loadData();
