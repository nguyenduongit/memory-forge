import { readFileSync, writeFileSync } from "node:fs";

const query = readFileSync(new URL("./migrations/0005_race_records.sql", import.meta.url), "utf8");
const input = {
  project_id: "cdoursfriqknrvjbbphg",
  name: "race_records",
  query,
};

writeFileSync("/tmp/memory-forge-supabase-migration.json", JSON.stringify(input));
