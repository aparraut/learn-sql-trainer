/* =====================================================
   🔌 SUPABASE INIT
   ===================================================== */

const SUPABASE_URL = "https://yuiwlbrfihyqoycsrhrc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1aXdsYnJmaWh5cW95Y3NyaHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMjkxODUsImV4cCI6MjA3ODcwNTE4NX0.3bb8_qc1VVTV8cZNP3irUOAUDsArWHV-QlObvPtI8cM";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;

/* =====================================================
   🧩 AUTH: Registro & Login
   ===================================================== */

async function registerUser() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const { data, error } = await supabaseClient.auth.signUp({ email, password });

  if (error) {
    document.getElementById('auth-message').innerText = error.message;
    return;
  }

  await supabaseClient.from('user_progress').insert({
    user_id: data.user.id,
    max_level: 1,
    total_score: 0
  });

  document.getElementById('auth-message').innerText =
    "Cuenta creada. Revisa tu correo para confirmar.";
}

async function loginUser() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    document.getElementById('auth-message').innerText = error.message;
    return;
  }

  loadUserProgress();
}

/* =====================================================
   🔄 Cargar progreso del usuario
   ===================================================== */

async function loadUserProgress() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  currentUser = user;

  if (!user) return;

  const { data: progress } = await supabaseClient
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!progress) {
    currentLevel = 0;
    score = 0;
  } else {
    currentLevel = progress.max_level - 1;
    score = progress.total_score;
  }

  document.getElementById('auth-screen').classList.remove('active');
  document.getElementById('start-screen').classList.add('active');

  document.getElementById('logout-btn').style.display = 'block';
}

/* =====================================================
   💾 Guardar progreso
   ===================================================== */

async function saveUserProgress(levelReached, totalScore) {
  if (!currentUser) return;

  await supabaseClient
    .from('user_progress')
    .update({
      max_level: levelReached,
      total_score: totalScore,
      updated_at: new Date()
    })
    .eq('user_id', currentUser.id);
}

/* =====================================================
   🧮 Variables del juego
   ===================================================== */

let levels = [];
let tables = {};
let currentLevel = 0;
let score = 0;
let timer = 60;
let countdown;

/* =====================================================
   📦 Cargar datos
   ===================================================== */

async function loadData() {
  const [lvl, tbl] = await Promise.all([
    fetch('data/levels.json'),
    fetch('data/tables.json')
  ]);

  levels = await lvl.json();
  tables = await tbl.json();
}
loadData();

/* =====================================================
   🎮 INICIAR JUEGO
   ===================================================== */

function startGame() {
  document.getElementById('start-screen').classList.remove('active');
  document.getElementById('game-screen').classList.add('active');
  startLevel();
}

/* =====================================================
   🎚 INICIAR NIVEL
   ===================================================== */

function startLevel() {
  const level = levels[currentLevel];

  document.getElementById('challenge-title').innerText = `Desafío ${level.id}`;
  document.getElementById('level-group').innerText = `✔️ Grupo: ${level.groupName}`;
  document.getElementById('level-topic').innerText = `✔️ Tema: ${level.topic}`;
  document.getElementById('level-difficulty').innerText = `✔️ Dificultad: ${level.difficulty}/10`;

  document.getElementById('challenge-description').innerText = level.description;

  document.getElementById('sql-input').value = '';
  document.getElementById('feedback').innerText = '';
  document.getElementById('result-table').innerHTML = '';
  document.getElementById('score').innerText = `Puntos: ${score}`;

  const hintText = document.getElementById('hint-text');
  hintText.style.display = 'none';
  hintText.innerText = level.hint;

  document.getElementById('next-level-btn').style.display = 'none';

  document.body.classList.remove('success', 'error');

  const tablePreviewDiv = document.getElementById('table-preview');
  tablePreviewDiv.innerHTML = renderTablePreview(level.table);

  timer = level.timeLimit || 60;
  clearInterval(countdown);
  countdown = setInterval(() => {
    document.getElementById('timer').innerText = `⏱️ ${timer--}s`;
    if (timer < 0) checkAnswer(true);
  }, 1000);
}

/* =====================================================
   🔍 Normalizar SQL
   ===================================================== */

function normalizeSQL(str) {
  return str.toLowerCase().replace(/\s+/g, ' ').replace(/;$/, '').trim();
}

/* =====================================================
   🧠 Motor SQL mejorado (AND, >=, <=)
   ===================================================== */

function applyWhere(data, whereClause) {
  const orParts = whereClause.split(/\s+or\s+/i);

  return data.filter(row => {
    return orParts.some(orCondition => {
      const andParts = orCondition.split(/\s+and\s+/i);

      return andParts.every(condition => {

        const likeMatch = condition.match(/(\w+)\s+like\s+'(.*)'/i);
        if (likeMatch) {
          const [, field, pattern] = likeMatch;
          const regex = new RegExp('^' + pattern.replace(/%/g, '.*') + '$', 'i');
          return regex.test(String(row[field]));
        }

        const match = condition.match(/(\w+)\s*(>=|<=|<>|>|<|=)\s*'?([\w\s]+)'?/i);
        if (!match) return false;

        const [, field, op, rawValue] = match;

        const rowValue = row[field];
        const value = isNaN(rawValue) ? rawValue.toLowerCase() : Number(rawValue);

        switch (op) {
          case '>':  return rowValue > value;
          case '<':  return rowValue < value;
          case '=':  return String(rowValue).toLowerCase() === String(value);
          case '>=': return rowValue >= value;
          case '<=': return rowValue <= value;
          case '<>': return String(rowValue).toLowerCase() !== String(value);
        }
      });
    });
  });
}

/* =====================================================
   🧮 Motor SQL General
   ===================================================== */

function executeQuery(query, tables) {
  try {
    query = query.replace(/\s+/g, ' ').trim();

    const joinRegex = /select\s+(.*?)\s+from\s+(\w+)\s+join\s+(\w+)\s+on\s+(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+);?/i;
    const jm = query.match(joinRegex);

    if (jm) {
      const [, selectFields, t1, t2, , leftK, , rightK] = jm;

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
          const key = f.includes('.') ? f.split('.')[1] : f;
          newRow[key] = row[key];
        });
        return newRow;
      });
    }

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
        const A = a[orderField];
        const B = b[orderField];
        if (A < B) return orderDir === 'desc' ? 1 : -1;
        if (A > B) return orderDir === 'desc' ? -1 : 1;
        return 0;
      });
    }

    if (limitValue) data = data.slice(0, Number(limitValue));

    if (selectFields.includes('count(*)')) return [{ count: data.length }];

    let fields =
      selectFields.trim() === '*'
        ? Object.keys(data[0])
        : selectFields.split(',').map(f => f.trim());

    return data.map(row => {
      const newRow = {};
      fields.forEach(f => (newRow[f] = row[f]));
      return newRow;
    });

  } catch {
    return [];
  }
}

/* =====================================================
   🧪 VALIDAR RESPUESTA
   ===================================================== */

function checkAnswer(isTimeout = false) {
  clearInterval(countdown);

  const userQuery = normalizeSQL(document.getElementById('sql-input').value);
  const level = levels[currentLevel];
  const expectedSql = normalizeSQL(level.solution);

  const feedback = document.getElementById('feedback');

  if (!userQuery && isTimeout) {
    feedback.innerText = '⏰ Se acabó el tiempo.';
    return;
  }

  const result = executeQuery(userQuery, tables);
  const expected = executeQuery(expectedSql, tables);

  const isCorrect =
    JSON.stringify(result) === JSON.stringify(expected);

  const resultArea = document.getElementById('result-table');
  resultArea.innerHTML = renderTable(result);

  if (isCorrect) {
    const reward = level.reward || 10;
    const timeBonus = Math.max(0, timer);
    score += reward + timeBonus;

    document.getElementById('score').innerText = `Puntos: ${score}`;
    feedback.innerText = '✅ ¡Correcto!';

    document.body.classList.add('success');

    document.getElementById('next-level-btn').style.display = 'inline-block';

    saveUserProgress(currentLevel + 1, score);

  } else {
    feedback.innerText = '❌ Incorrecto.';
    document.body.classList.add('error');
  }
}

/* =====================================================
   ⏭ SIGUIENTE NIVEL
   ===================================================== */

function nextLevel() {
  currentLevel++;
  if (currentLevel >= levels.length) endGame();
  else startLevel();
}

/* =====================================================
   🏁 FIN DEL JUEGO
   ===================================================== */

function endGame() {
  document.getElementById('game-screen').classList.remove('active');
  document.getElementById('end-screen').classList.add('active');
  document.getElementById('final-score').innerText =
    `Tu puntuación final: ${score} puntos`;
}

/* =====================================================
   📊 RENDER TABLAS
   ===================================================== */

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
    html += '<h4>products</h4>' + renderTable(tables.products);
  } else if (tables[tableField]) {
    html += `<h4>${tableField}</h4>` + renderTable(tables[tableField]);
  }

  html += '</div>';
  return html;
}

/* =====================================================
   🎮 EVENTOS
   ===================================================== */

document.getElementById('login-btn').onclick = loginUser;
document.getElementById('register-btn').onclick = registerUser;

document.getElementById('start-btn').onclick = startGame;
document.getElementById('run-query').onclick = () => checkAnswer(false);
document.getElementById('next-level-btn').onclick = nextLevel;

document.getElementById('retry-btn').onclick = () => location.reload();

document.getElementById('hint-btn').onclick = () =>
  (document.getElementById('hint-text').style.display = 'block');

document.getElementById('logout-btn').onclick = async () => {
  await supabaseClient.auth.signOut();
  location.reload();
};
