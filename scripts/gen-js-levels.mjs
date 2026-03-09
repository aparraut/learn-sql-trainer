import fs from "node:fs";

const levels = [];

const diffById = (i) => Math.min(10, Math.floor((i - 1) / 10) + 1);
const timeByDiff = (d) => Math.max(45, 95 - d * 5);
const rewardByDiff = (d) => 15 + d * 6;

let id = 1;

function add(level) {
  levels.push({ id: id++, ...level });
}

for (let i = 1; i <= 100; i++) {
  const d = diffById(i);
  const timeLimit = timeByDiff(d);
  const reward = rewardByDiff(d);

  if (i <= 10) {
    const n = i;
    add({
      groupName: "Fundamentos",
      topic: "Suma basica",
      difficulty: d,
      timeLimit,
      reward,
      description: `Crea add${n}(a, b) y retorna a + b + ${n}.`,
      hint: "Usa return a + b + N.",
      functionName: `add${n}`,
      starterCode: `function add${n}(a, b) {\n  // TODO\n}`,
      solution: `function add${n}(a, b) { return a + b + ${n}; }`,
      tests: [
        { input: [1, 2], expected: 1 + 2 + n },
        { input: [5, -1], expected: 5 - 1 + n },
      ],
    });
    continue;
  }

  if (i <= 20) {
    const n = i - 10;
    add({
      groupName: "Condicionales",
      topic: "Mayor que",
      difficulty: d,
      timeLimit,
      reward,
      description: `Crea isGreater${n}(x) y retorna true si x > ${n * 3}.`,
      hint: "Usa operador > y retorna boolean.",
      functionName: `isGreater${n}`,
      starterCode: `function isGreater${n}(x) {\n  // TODO\n}`,
      solution: `function isGreater${n}(x) { return x > ${n * 3}; }`,
      tests: [
        { input: [n * 3 + 1], expected: true },
        { input: [n * 3], expected: false },
      ],
    });
    continue;
  }

  if (i <= 30) {
    const n = i - 20;
    add({
      groupName: "Strings",
      topic: "Plantillas",
      difficulty: d,
      timeLimit,
      reward,
      description: `Crea tag${n}(name) y retorna \"L${n}: <name>\".`,
      hint: "Template literal recomendado.",
      functionName: `tag${n}`,
      starterCode: `function tag${n}(name) {\n  // TODO\n}`,
      solution: `function tag${n}(name) { return \`L${n}: \${name}\`; }`,
      tests: [
        { input: ["Ana"], expected: `L${n}: Ana` },
        { input: ["Beto"], expected: `L${n}: Beto` },
      ],
    });
    continue;
  }

  if (i <= 40) {
    const n = i - 30;
    add({
      groupName: "Arrays",
      topic: "Map",
      difficulty: d,
      timeLimit,
      reward,
      description: `Crea mult${n}(arr) y multiplica cada elemento por ${n}.`,
      hint: "arr.map((x) => x * N)",
      functionName: `mult${n}`,
      starterCode: `function mult${n}(arr) {\n  // TODO\n}`,
      solution: `function mult${n}(arr) { return arr.map((x) => x * ${n}); }`,
      tests: [
        { input: [[1, 2, 3]], expected: [1 * n, 2 * n, 3 * n] },
        { input: [[0, -1]], expected: [0, -1 * n] },
      ],
    });
    continue;
  }

  if (i <= 50) {
    const n = i - 40;
    add({
      groupName: "Arrays",
      topic: "Filter",
      difficulty: d,
      timeLimit,
      reward,
      description: `Crea gt${n}(arr) y devuelve valores > ${n}.`,
      hint: "arr.filter((x) => x > N)",
      functionName: `gt${n}`,
      starterCode: `function gt${n}(arr) {\n  // TODO\n}`,
      solution: `function gt${n}(arr) { return arr.filter((x) => x > ${n}); }`,
      tests: [
        { input: [[n - 1, n, n + 1, n + 5]], expected: [n + 1, n + 5] },
        { input: [[-5, -1]], expected: [] },
      ],
    });
    continue;
  }

  if (i <= 60) {
    const n = i - 50;
    add({
      groupName: "Objetos",
      topic: "Propiedades",
      difficulty: d,
      timeLimit,
      reward,
      description: `Crea withLevel${n}(user) y retorna copia con level: ${n}.`,
      hint: "Usa spread: { ...user, level: N }",
      functionName: `withLevel${n}`,
      starterCode: `function withLevel${n}(user) {\n  // TODO\n}`,
      solution: `function withLevel${n}(user) { return { ...user, level: ${n} }; }`,
      tests: [
        { input: [{ name: "Ana" }], expected: { name: "Ana", level: n } },
        { input: [{ id: 7, active: true }], expected: { id: 7, active: true, level: n } },
      ],
    });
    continue;
  }

  if (i <= 70) {
    const n = i - 60;
    add({
      groupName: "Funciones",
      topic: "Reduce",
      difficulty: d,
      timeLimit,
      reward,
      description: `Crea sumPlus${n}(arr) y retorna suma total + ${n}.`,
      hint: "reduce para sumar y luego +N.",
      functionName: `sumPlus${n}`,
      starterCode: `function sumPlus${n}(arr) {\n  // TODO\n}`,
      solution: `function sumPlus${n}(arr) { return arr.reduce((acc, x) => acc + x, 0) + ${n}; }`,
      tests: [
        { input: [[1, 2, 3]], expected: 6 + n },
        { input: [[10]], expected: 10 + n },
      ],
    });
    continue;
  }

  if (i <= 80) {
    const n = i - 70;
    add({
      groupName: "Intermedio",
      topic: "Conteos",
      difficulty: d,
      timeLimit,
      reward,
      description: `Crea countLong${n}(arr) y cuenta strings con longitud >= ${n}.`,
      hint: "filter + length.",
      functionName: `countLong${n}`,
      starterCode: `function countLong${n}(arr) {\n  // TODO\n}`,
      solution: `function countLong${n}(arr) { return arr.filter((s) => s.length >= ${n}).length; }`,
      tests: [
        { input: [["a", "abcd", "abcdefgh"]], expected: ["a", "abcd", "abcdefgh"].filter((s) => s.length >= n).length },
        { input: [["xx", "yyy", "zzzz"]], expected: ["xx", "yyy", "zzzz"].filter((s) => s.length >= n).length },
      ],
    });
    continue;
  }

  if (i <= 90) {
    const n = i - 80;
    add({
      groupName: "Avanzado",
      topic: "Normalizacion",
      difficulty: d,
      timeLimit,
      reward,
      description: `Crea normalize${n}(text) que haga trim, lowercase y agregue '-${n}'.`,
      hint: "text.trim().toLowerCase()",
      functionName: `normalize${n}`,
      starterCode: `function normalize${n}(text) {\n  // TODO\n}`,
      solution: `function normalize${n}(text) { return text.trim().toLowerCase() + '-${n}'; }`,
      tests: [
        { input: ["  HOLA "], expected: `hola-${n}` },
        { input: [" JS "], expected: `js-${n}` },
      ],
    });
    continue;
  }

  const n = i - 90;
  add({
    groupName: "Maestro JS",
    topic: "Composicion",
    difficulty: d,
    timeLimit,
    reward,
    description: `Crea solve${n}(arr) -> filtra pares, duplica y suma todo + ${n}.`,
    hint: "filter even -> map *2 -> reduce sum.",
    functionName: `solve${n}`,
    starterCode: `function solve${n}(arr) {\n  // TODO\n}`,
    solution: `function solve${n}(arr) { return arr.filter((x) => x % 2 === 0).map((x) => x * 2).reduce((acc, x) => acc + x, 0) + ${n}; }`,
    tests: [
      { input: [[1, 2, 3, 4]], expected: 2 * 2 + 4 * 2 + n },
      { input: [[5, 7, 8]], expected: 8 * 2 + n },
    ],
  });
}

fs.writeFileSync("data/js-levels.json", JSON.stringify(levels, null, 2));
console.log(`Generated ${levels.length} JS levels.`);
