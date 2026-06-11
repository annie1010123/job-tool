import { config } from "dotenv";
config({ path: ".env.local" });
import { expandIntent } from "../../lib/intent/expand";

async function main() {
  const kws = await expandIntent("專案管理實習生，有興趣 Agile/Scrum，時程管控");
  console.log(kws);
}
main().catch(console.error);
