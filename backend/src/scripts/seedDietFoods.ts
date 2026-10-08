/**
 * Seeds a diet food catalogue into the Cosmos `dietFoods` container — the
 * food names the doctor portal's diet-plan builder suggests for any org whose
 * organizations.diet_food_catalog points at that catalogue.
 *
 * Source data: src/scripts/data/ayurvedaDietFoods.json (265 foods), extracted
 * from the Anandalakshmi hospital's "Package Diet . Final2026.xlsx"
 * (Kapha/Pitha/Vatha/Weight Loss sheets) and "Snehapanam & Purgation Diet
 * 2026.xlsx". Spelling variants of the same dish were merged into one name and
 * the Snehapanam sheet's 11:00 slot mapped to "Snacks".
 *
 * Ids are derived from the catalogue id + food name, so re-running updates in
 * place rather than creating duplicates.
 *
 * Defaults to a DRY RUN — prints what it would write and changes nothing:
 *   npx ts-node src/scripts/seedDietFoods.ts
 *
 * Pass --apply to actually write:
 *   npx ts-node src/scripts/seedDietFoods.ts --apply
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { getContainer } from "../config/cosmos";
import { CosmosClient } from "@azure/cosmos";
import { DIET_FOOD_CATALOGS, DietCatalogFood } from "../data/dietFoodCatalogs";

const APPLY = process.argv.includes("--apply");

const CATALOG_ID = "ayurveda";
const DATA_FILE = "ayurvedaDietFoods.json";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function main() {
  const meta = DIET_FOOD_CATALOGS[CATALOG_ID];
  if (!meta) {
    console.error(`Unknown catalogue "${CATALOG_ID}" — add it to src/data/dietFoodCatalogs.ts first.`);
    process.exit(1);
  }

  const foods: DietCatalogFood[] = JSON.parse(fs.readFileSync(path.join(__dirname, "data", DATA_FILE), "utf8"));

  // Every food's diets must be ones the catalogue declares, or the portal's
  // diet filter could never surface it.
  const unknownDiets = foods.flatMap((f) => f.diets.filter((d) => !meta.diets.includes(d)).map((d) => `${f.name}: ${d}`));
  if (unknownDiets.length) {
    console.error(`Refusing to seed: diets not declared on catalogue "${CATALOG_ID}":\n  ${unknownDiets.join("\n  ")}`);
    process.exit(1);
  }

  const ids = foods.map((f) => `${CATALOG_ID}-${slugify(f.name)}`);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) {
    console.error(`Refusing to seed: duplicate food ids ${[...new Set(dupes)].join(", ")}`);
    process.exit(1);
  }

  console.log(`Catalogue : ${meta.label} (${CATALOG_ID})`);
  console.log(`Source    : ${foods.length} foods\n`);

  if (!APPLY) {
    for (const [i, f] of foods.entries()) {
      console.log(`  ${ids[i].padEnd(48)} ${f.diets.join(", ")}  |  ${f.meals.join(", ")}`);
    }
    console.log(`\nDry run — nothing written. Re-run with --apply to write.`);
    return;
  }

  // The server creates this container on startup (initCosmosContainers), but
  // make sure it exists so the seed can run before that deploy lands.
  const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING!);
  await client
    .database(process.env.COSMOS_DATABASE || "wellness")
    .containers.createIfNotExists({ id: "dietFoods", partitionKey: { paths: ["/catalogId"] } });
  const container = getContainer("dietFoods");

  const now = new Date().toISOString();
  let created = 0;
  let updated = 0;

  for (const [i, f] of foods.entries()) {
    const id = ids[i];
    const { resource: existing } = await container
      .item(id, CATALOG_ID)
      .read()
      .catch(() => ({ resource: undefined as any }));

    await container.items.upsert({
      id,
      catalogId: CATALOG_ID,
      name: f.name,
      diets: f.diets,
      meals: f.meals,
      source: DATA_FILE,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    existing ? updated++ : created++;
  }

  console.log(`Done — ${created} created, ${updated} updated.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
