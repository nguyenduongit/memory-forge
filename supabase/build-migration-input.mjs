import { readFileSync, writeFileSync } from "node:fs";

const query = readFileSync(new URL("./migrations/0004_correct_default_asset_keys.sql", import.meta.url), "utf8");
const input = {
  project_id: "cdoursfriqknrvjbbphg",
  name: "correct_default_asset_keys",
  query,
};

writeFileSync("/tmp/memory-forge-supabase-migration.json", JSON.stringify(input));
