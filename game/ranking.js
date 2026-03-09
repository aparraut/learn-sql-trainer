import { getRanking } from "../supabase.js";

export async function renderRanking() {
  const container = document.getElementById("ranking-container");

  const loader = document.createElement("div");
  loader.className = "level-map-loader";
  loader.textContent = "Cargando ranking";
  container.replaceChildren(loader);

  try {
    const list = (await getRanking()) || [];
    container.replaceChildren();

    list.forEach((item, i) => {
      const wrapper = document.createElement("div");
      wrapper.classList.add("achievement");

      const position = document.createElement("div");
      position.style.fontSize = "20px";
      position.style.width = "40px";
      position.style.textAlign = "center";
      position.textContent = String(i + 1);

      const textBlock = document.createElement("div");

      const username = document.createElement("div");
      username.className = "achievement-title";
      username.textContent = item.username || "Anon";

      const score = document.createElement("div");
      score.className = "achievement-desc";
      score.textContent = `Puntos: ${item.score ?? 0}`;

      textBlock.append(username, score);
      wrapper.append(position, textBlock);
      container.appendChild(wrapper);
    });
  } catch (error) {
    const message = document.createElement("p");
    message.className = "subtitle";
    message.textContent = `No se pudo cargar el ranking: ${error.message || error}`;
    container.replaceChildren(message);
  }
}
