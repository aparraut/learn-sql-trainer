import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const tablesPath = path.join(projectRoot, "data", "tables.json");
const levelsPath = path.join(projectRoot, "data", "levels.json");

const tablesRaw = await fs.readFile(tablesPath, "utf8");
const levelsRaw = await fs.readFile(levelsPath, "utf8");
const tablesData = JSON.parse(tablesRaw);
const levels = JSON.parse(levelsRaw);

globalThis.fetch = async (resource) => {
  const request = String(resource);

  if (request.endsWith("./data/tables.json") || request.endsWith("data/tables.json")) {
    return {
      ok: true,
      status: 200,
      async json() {
        return tablesData;
      },
    };
  }

  if (request.endsWith("./data/levels.json") || request.endsWith("data/levels.json")) {
    return {
      ok: true,
      status: 200,
      async json() {
        return levels;
      },
    };
  }

  return {
    ok: false,
    status: 404,
    async json() {
      return {};
    },
  };
};

const sqlEngineUrl = pathToFileURL(path.join(projectRoot, "sql", "sql-engine.js")).href;
const { loadTablesData, executeSQL } = await import(sqlEngineUrl);

await loadTablesData();

const failures = [];

for (const level of levels) {
  const result = executeSQL(level.solution);
  const failed = Array.isArray(result) && result[0] && typeof result[0].error === "string";

  if (failed) {
    failures.push({
      id: level.id,
      error: result[0].error,
      solution: level.solution,
    });
  }
}

if (failures.length > 0) {
  console.error(`ERROR: ${failures.length} soluciones invalidas detectadas.`);
  failures.slice(0, 15).forEach((item) => {
    console.error(`- Nivel ${item.id}: ${item.error}`);
    console.error(`  SQL: ${item.solution}`);
  });
  process.exit(1);
}

console.log(`OK: ${levels.length} niveles validados sin errores de parser/engine.`);
