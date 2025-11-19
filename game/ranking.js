import { getRanking } from "../supabase.js";

export async function renderRanking() {
  const container = document.getElementById("ranking-container");
  container.innerHTML = "<div class='level-map-loader'>Cargando ranking</div>";

  const list = await getRanking();

  container.innerHTML = "";

  list.forEach((item, i) => {
    const div = document.createElement("div");
    div.classList.add("achievement"); // reutilizamos el estilo

    div.innerHTML = `
      <div style="font-size:20px; width:40px; text-align:center;">
        ${i + 1}
      </div>
      <div>
        <div class="achievement-title">${item.username}</div>
        <div class="achievement-desc">Puntos: ${item.score}</div>
      </div>
    `;

    container.appendChild(div);
  });
}
