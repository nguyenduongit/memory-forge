import { readFileSync, writeFileSync } from "node:fs";

const query = readFileSync(new URL("./migrations/0006_single_player_shared_state.sql", import.meta.url), "utf8");
const input = {
  project_id: "cdoursfriqknrvjbbphg",
  name: "single_player_shared_state",
  query,
};

writeFileSync("/tmp/memory-forge-supabase-migration.json", JSON.stringify(input));
