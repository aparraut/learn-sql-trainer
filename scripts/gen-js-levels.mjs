import fs from "node:fs";

const levels = [];

const diffById = (i) => Math.min(10, Math.floor((i - 1) / 10) + 1);
const timeByDiff = (d) => Math.max(45, 95 - d * 5);
const rewardByDiff = (d) => 15 + d * 6;

let id = 1;

function add(spec) {
  const d = diffById(id);
  levels.push({
    id: id++,
    difficulty: d,
    timeLimit: timeByDiff(d),
    reward: rewardByDiff(d),
    ...spec
  });
}

const blueprints = [
  {
    groupName: "Fundamentos",
    topic: "Suma",
    make: (n) => ({
      description: `Crea add${n}(a, b) y retorna a + b + ${n}.`,
      hint: "Usa return a + b + N.",
      functionName: `add${n}`,
      starterCode: `function add${n}(a, b) {\n  // TODO\n}`,
      solution: `function add${n}(a, b) { return a + b + ${n}; }`,
      tests: [
        { input: [1, 2], expected: 3 + n },
        { input: [-3, 4], expected: 1 + n }
      ]
    })
  },
  {
    groupName: "Fundamentos",
    topic: "Resta",
    make: (n) => ({
      description: `Crea sub${n}(a, b) y retorna a - b - ${n}.`,
      hint: "Usa return a - b - N.",
      functionName: `sub${n}`,
      starterCode: `function sub${n}(a, b) {\n  // TODO\n}`,
      solution: `function sub${n}(a, b) { return a - b - ${n}; }`,
      tests: [
        { input: [10, 2], expected: 8 - n },
        { input: [5, 9], expected: -4 - n }
      ]
    })
  },
  {
    groupName: "Fundamentos",
    topic: "Multiplicacion",
    make: (n) => ({
      description: `Crea mul${n}(a, b) y retorna a * b * ${n}.`,
      hint: "Multiplica a, b y N.",
      functionName: `mul${n}`,
      starterCode: `function mul${n}(a, b) {\n  // TODO\n}`,
      solution: `function mul${n}(a, b) { return a * b * ${n}; }`,
      tests: [
        { input: [2, 3], expected: 6 * n },
        { input: [-1, 4], expected: -4 * n }
      ]
    })
  },
  {
    groupName: "Fundamentos",
    topic: "Potencias",
    make: (n) => ({
      description: `Crea pow${n}(x) y retorna x elevado a ${n}.`,
      hint: "Usa Math.pow o **.",
      functionName: `pow${n}`,
      starterCode: `function pow${n}(x) {\n  // TODO\n}`,
      solution: `function pow${n}(x) { return Math.pow(x, ${n}); }`,
      tests: [
        { input: [2], expected: Math.pow(2, n) },
        { input: [3], expected: Math.pow(3, n) }
      ]
    })
  },
  {
    groupName: "Condicionales",
    topic: "Clamp",
    make: (n) => ({
      description: `Crea clamp${n}(x) y limita x al rango 0..${n}.`,
      hint: "Si x < 0 retorna 0; si x > N retorna N.",
      functionName: `clamp${n}`,
      starterCode: `function clamp${n}(x) {\n  // TODO\n}`,
      solution: `function clamp${n}(x) { if (x < 0) return 0; if (x > ${n}) return ${n}; return x; }`,
      tests: [
        { input: [-2], expected: 0 },
        { input: [n + 2], expected: n }
      ]
    })
  },
  {
    groupName: "Condicionales",
    topic: "Multiplo",
    make: (n) => ({
      description: `Crea isMultiple${n}(x) y retorna true si x es multiplo de ${n}.`,
      hint: "x % N === 0.",
      functionName: `isMultiple${n}`,
      starterCode: `function isMultiple${n}(x) {\n  // TODO\n}`,
      solution: `function isMultiple${n}(x) { return x % ${n} === 0; }`,
      tests: [
        { input: [n * 3], expected: true },
        { input: [n * 3 + 1], expected: false }
      ]
    })
  },
  {
    groupName: "Condicionales",
    topic: "Rango",
    make: (n) => ({
      description: `Crea between${n}(x) y retorna true si x esta entre ${n} y ${n * 3} (exclusivo).`,
      hint: "Usa > y <.",
      functionName: `between${n}`,
      starterCode: `function between${n}(x) {\n  // TODO\n}`,
      solution: `function between${n}(x) { return x > ${n} && x < ${n * 3}; }`,
      tests: [
        { input: [n + 1], expected: true },
        { input: [n * 3], expected: false }
      ]
    })
  },
  {
    groupName: "Strings",
    topic: "Plantillas",
    make: (n) => ({
      description: `Crea tag${n}(name) y retorna "L${n}: <name>".`,
      hint: "Template literal recomendado.",
      functionName: `tag${n}`,
      starterCode: `function tag${n}(name) {\n  // TODO\n}`,
      solution: `function tag${n}(name) { return \`L${n}: \${name}\`; }`,
      tests: [
        { input: ["Ana"], expected: `L${n}: Ana` },
        { input: ["Beto"], expected: `L${n}: Beto` }
      ]
    })
  },
  {
    groupName: "Strings",
    topic: "Repetir",
    make: (n) => ({
      description: `Crea repeat${n}(str) y retorna str repetido ${n} veces.`,
      hint: "Usa repeat.",
      functionName: `repeat${n}`,
      starterCode: `function repeat${n}(str) {\n  // TODO\n}`,
      solution: `function repeat${n}(str) { return str.repeat(${n}); }`,
      tests: [
        { input: ["ha"], expected: "ha".repeat(n) },
        { input: ["x"], expected: "x".repeat(n) }
      ]
    })
  },
  {
    groupName: "Strings",
    topic: "Truncar",
    make: (n) => ({
      description: `Crea truncate${n}(str) y recorta a ${n} con "...".`,
      hint: "Si length<=N retorna original.",
      functionName: `truncate${n}`,
      starterCode: `function truncate${n}(str) {\n  // TODO\n}`,
      solution: `function truncate${n}(str) { return str.length <= ${n} ? str : str.slice(0, ${n}) + "..."; }`,
      tests: [
        { input: ["abcdef"], expected: "abcdef".length <= n ? "abcdef" : "abcdef".slice(0, n) + "..." },
        { input: ["hi"], expected: "hi" }
      ]
    })
  },
  {
    groupName: "Arrays",
    topic: "Map",
    make: (n) => ({
      description: `Crea mapAdd${n}(arr) y suma ${n} a cada elemento.`,
      hint: "Usa map.",
      functionName: `mapAdd${n}`,
      starterCode: `function mapAdd${n}(arr) {\n  // TODO\n}`,
      solution: `function mapAdd${n}(arr) { return arr.map((x) => x + ${n}); }`,
      tests: [
        { input: [[1, 2]], expected: [1 + n, 2 + n] },
        { input: [[-1, 0]], expected: [-1 + n, 0 + n] }
      ]
    })
  },
  {
    groupName: "Arrays",
    topic: "Filter",
    make: (n) => ({
      description: `Crea filterGte${n}(arr) y devuelve valores >= ${n}.`,
      hint: "Usa filter.",
      functionName: `filterGte${n}`,
      starterCode: `function filterGte${n}(arr) {\n  // TODO\n}`,
      solution: `function filterGte${n}(arr) { return arr.filter((x) => x >= ${n}); }`,
      tests: [
        { input: [[n - 1, n, n + 1]], expected: [n, n + 1] },
        { input: [[-5, -1]], expected: [] }
      ]
    })
  },
  {
    groupName: "Funciones",
    topic: "Reduce",
    make: (n) => ({
      description: `Crea sumPlus${n}(arr) y retorna suma total + ${n}.`,
      hint: "reduce para sumar y luego +N.",
      functionName: `sumPlus${n}`,
      starterCode: `function sumPlus${n}(arr) {\n  // TODO\n}`,
      solution: `function sumPlus${n}(arr) { return arr.reduce((acc, x) => acc + x, 0) + ${n}; }`,
      tests: [
        { input: [[1, 2, 3]], expected: 6 + n },
        { input: [[10]], expected: 10 + n }
      ]
    })
  },
  {
    groupName: "Intermedio",
    topic: "Conteo",
    make: (n) => ({
      description: `Crea countLong${n}(arr) y cuenta strings con longitud >= ${n}.`,
      hint: "filter + length.",
      functionName: `countLong${n}`,
      starterCode: `function countLong${n}(arr) {\n  // TODO\n}`,
      solution: `function countLong${n}(arr) { return arr.filter((s) => s.length >= ${n}).length; }`,
      tests: [
        { input: [["a", "abcd", "abcdefgh"]], expected: ["a", "abcd", "abcdefgh"].filter((s) => s.length >= n).length },
        { input: [["xx", "yyy", "zzzz"]], expected: ["xx", "yyy", "zzzz"].filter((s) => s.length >= n).length }
      ]
    })
  },
  {
    groupName: "Objetos",
    topic: "Propiedades",
    make: (n) => ({
      description: `Crea withLevel${n}(user) y retorna copia con level: ${n}.`,
      hint: "Usa spread: { ...user, level: N }",
      functionName: `withLevel${n}`,
      starterCode: `function withLevel${n}(user) {\n  // TODO\n}`,
      solution: `function withLevel${n}(user) { return { ...user, level: ${n} }; }`,
      tests: [
        { input: [{ name: "Ana" }], expected: { name: "Ana", level: n } },
        { input: [{ id: 7, active: true }], expected: { id: 7, active: true, level: n } }
      ]
    })
  },
  {
    groupName: "Objetos",
    topic: "Get key",
    make: (n) => ({
      description: `Crea getK${n}(obj) y retorna obj.k${n} o null.`,
      hint: "Accede a la key dinamica.",
      functionName: `getK${n}`,
      starterCode: `function getK${n}(obj) {\n  // TODO\n}`,
      solution: `function getK${n}(obj) { return Object.prototype.hasOwnProperty.call(obj, "k${n}") ? obj["k${n}"] : null; }`,
      tests: [
        { input: [{ [`k${n}`]: n }], expected: n },
        { input: [{}], expected: null }
      ]
    })
  },
  {
    groupName: "Bucles",
    topic: "Rango",
    make: (n) => ({
      description: `Crea range${n}() y retorna [1..${n}].`,
      hint: "Usa un for.",
      functionName: `range${n}`,
      starterCode: `function range${n}() {\n  // TODO\n}`,
      solution: `function range${n}() { const out = []; for (let i = 1; i <= ${n}; i++) out.push(i); return out; }`,
      tests: [
        { input: [], expected: Array.from({ length: n }, (_, i) => i + 1) },
        { input: [], expected: Array.from({ length: n }, (_, i) => i + 1) }
      ]
    })
  },
  {
    groupName: "Arrays",
    topic: "Slice",
    make: (n) => ({
      description: `Crea take${n}(arr) y retorna los primeros ${n} elementos.`,
      hint: "Usa slice.",
      functionName: `take${n}`,
      starterCode: `function take${n}(arr) {\n  // TODO\n}`,
      solution: `function take${n}(arr) { return arr.slice(0, ${n}); }`,
      tests: [
        { input: [[1, 2, 3, 4, 5]], expected: [1, 2, 3, 4, 5].slice(0, n) },
        { input: [[9, 8]], expected: [9, 8].slice(0, n) }
      ]
    })
  },
  {
    groupName: "Strings",
    topic: "Padding",
    make: (n) => ({
      description: `Crea pad${n}(str) y retorna str con padding de '0' hasta ${n}.`,
      hint: "Usa padStart.",
      functionName: `pad${n}`,
      starterCode: `function pad${n}(str) {\n  // TODO\n}`,
      solution: `function pad${n}(str) { return str.padStart(${n}, "0"); }`,
      tests: [
        { input: ["7"], expected: "7".padStart(n, "0") },
        { input: ["99"], expected: "99".padStart(n, "0") }
      ]
    })
  },
  {
    groupName: "Maestro JS",
    topic: "Zip",
    make: (n) => ({
      description: `Crea zip${n}(a, b) y retorna pares hasta ${n} elementos.`,
      hint: "Itera hasta min(n, lengths).",
      functionName: `zip${n}`,
      starterCode: `function zip${n}(a, b) {\n  // TODO\n}`,
      solution: `function zip${n}(a, b) { const out = []; const len = Math.min(${n}, a.length, b.length); for (let i = 0; i < len; i++) out.push([a[i], b[i]]); return out; }`,
      tests: [
        { input: [[1, 2, 3], ["a", "b", "c"]], expected: Array.from({ length: Math.min(n, 3) }, (_, i) => [i + 1, ["a", "b", "c"][i]]) },
        { input: [[1], ["x", "y"]], expected: Array.from({ length: Math.min(n, 1) }, (_, i) => [1, "x"]) }
      ]
    })
  }
];

for (let round = 1; round <= 5; round++) {
  blueprints.forEach((bp) => add({ groupName: bp.groupName, topic: bp.topic, ...bp.make(round) }));
}

fs.writeFileSync("data/js-levels.json", JSON.stringify(levels, null, 2));
console.log(`Generated ${levels.length} JS levels.`);
