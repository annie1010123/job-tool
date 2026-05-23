import { config } from "dotenv";
config({ path: ".env.local" });
import { prisma } from "../../lib/db/client";

// Gold set: title contains any PM-related keyword
const GOLD_KEYWORDS = [
  "專案管理", "PM", "Project Management", "專案助理",
  "產品管理", "產品助理", "project manager",
];

function isRelevant(title: string): boolean {
  return GOLD_KEYWORDS.some((k) => title.toLowerCase().includes(k.toLowerCase()));
}

function precisionAtK(topK: Array<{ title: string }>, k: number): number {
  const hits = topK.slice(0, k).filter((j) => isRelevant(j.title)).length;
  return hits / k;
}

async function main() {
  console.log("📊 JobPilot Evaluation\n");

  // Get user
  const user = await prisma.user.findFirst({
    where: { resume: { isNot: null }, jobIntent: { isNot: null } },
    select: { id: true, email: true },
  });
  if (!user) { console.error("No user found"); process.exit(1); }
  console.log(`User: ${user.email}\n`);

  const [resume, intent] = await Promise.all([
    prisma.resume.findUnique({ where: { userId: user.id } }),
    prisma.jobIntent.findUnique({ where: { userId: user.id } }),
  ]);
  if (!resume || !intent) { console.error("Missing resume/intent"); process.exit(1); }

  const [resumeEmb, intentEmb] = await Promise.all([
    prisma.resumeEmbedding.findUnique({ where: { resumeId: resume.id } }),
    prisma.intentEmbedding.findUnique({ where: { intentId: intent.id } }),
  ]);
  if (!resumeEmb || !intentEmb) { console.error("Missing embeddings"); process.exit(1); }

  const expandedKeywords = intent.expandedKeywords as string[];
  const total = await prisma.jd.count();
  const goldCount = (await prisma.jd.findMany({ select: { title: true } }))
    .filter((j) => isRelevant(j.title)).length;

  console.log(`職缺總數: ${total} | Gold set: ${goldCount} (${((goldCount/total)*100).toFixed(1)}%)\n`);

  // ── Method 1: Keyword Baseline ──────────────────────────────────────────────
  const allJds = await prisma.jd.findMany({ select: { id: true, title: true } });
  const keywordScored = allJds.map((j) => {
    const score = expandedKeywords.filter((k) =>
      j.title.toLowerCase().includes(k.toLowerCase())
    ).length;
    return { ...j, score };
  }).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  // ── Method 2: Resume-only vector ────────────────────────────────────────────
  const resumeOnly = await prisma.$queryRaw<Array<{ jdId: string; title: string; score: number }>>`
    SELECT je."jdId", j.title,
      (1 - (je.embedding <=> re.embedding))::float AS score
    FROM "JdEmbedding" je
    JOIN "Jd" j ON j.id = je."jdId"
    CROSS JOIN (SELECT embedding FROM "ResumeEmbedding" WHERE "resumeId" = ${resume.id}) re
    ORDER BY score DESC
    LIMIT 10
  `;

  // ── Method 3: Full system (0.2 resume + 0.8 intent) ─────────────────────────
  const fullSystem = await prisma.$queryRaw<Array<{ jdId: string; title: string; score: number }>>`
    SELECT je."jdId", j.title,
      (0.2 * (1 - (je.embedding <=> re.embedding)) +
       0.8 * (1 - (je.embedding <=> ie.embedding)))::float AS score
    FROM "JdEmbedding" je
    JOIN "Jd" j ON j.id = je."jdId"
    CROSS JOIN (SELECT embedding FROM "ResumeEmbedding" WHERE "resumeId" = ${resume.id}) re
    CROSS JOIN (SELECT embedding FROM "IntentEmbedding" WHERE "intentId" = ${intent.id}) ie
    ORDER BY score DESC
    LIMIT 10
  `;

  // ── Results ─────────────────────────────────────────────────────────────────
  const K_VALUES = [5, 10];
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("方法                   P@5    P@10");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const methods = [
    { name: "Keyword Baseline      ", results: keywordScored },
    { name: "Resume-only Embedding ", results: resumeOnly.map(r => ({ title: r.title })) },
    { name: "Full System (0.2/0.8) ", results: fullSystem.map(r => ({ title: r.title })) },
  ];

  const evalResults: Record<string, Record<number, number>> = {};

  for (const m of methods) {
    const scores: Record<number, number> = {};
    for (const k of K_VALUES) {
      scores[k] = precisionAtK(m.results, k);
    }
    evalResults[m.name.trim()] = scores;
    const row = K_VALUES.map((k) => `${(scores[k] * 100).toFixed(0)}%`.padStart(6)).join("  ");
    console.log(`${m.name}  ${row}`);
  }
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // ── Top 5 detail per method ──────────────────────────────────────────────────
  console.log("\n📋 Top 5 詳細結果\n");
  for (const m of methods) {
    console.log(`【${m.name.trim()}】`);
    m.results.slice(0, 5).forEach((j, i) => {
      const mark = isRelevant(j.title) ? "✅" : "❌";
      console.log(`  ${i + 1}. ${mark} ${j.title}`);
    });
    console.log();
  }

  // ── Analysis ─────────────────────────────────────────────────────────────────
  const baselineP5  = evalResults["Keyword Baseline"]?.[5] ?? 0;
  const resumeP5    = evalResults["Resume-only Embedding"]?.[5] ?? 0;
  const fullP5      = evalResults["Full System (0.2/0.8)"]?.[5] ?? 0;
  const resumeP10   = evalResults["Resume-only Embedding"]?.[10] ?? 0;
  const fullP10     = evalResults["Full System (0.2/0.8)"]?.[10] ?? 0;

  console.log("📊 分析");
  console.log(`  Resume-only → Full System P@5:  ${resumeP5*100}% → ${fullP5*100}%  (+${((fullP5-resumeP5)*100).toFixed(0)}pp)`);
  console.log(`  Resume-only → Full System P@10: ${resumeP10*100}% → ${fullP10*100}% (+${((fullP10-resumeP10)*100).toFixed(0)}pp)`);
  console.log(`  Full System vs Keyword Baseline P@5: ${fullP5*100}% vs ${baselineP5*100}% (baseline 循環優勢：gold set 以關鍵字定義)`);
  console.log(`\n⚠️  Keyword baseline 的 gold set 與評分方法相同（關鍵字），存在循環性`);
  console.log(`   → 真正重要的對照：Resume-only (${resumeP5*100}%) vs Full System (${fullP5*100}%)`);
  console.log(`   → Intent embedding 帶來 +${((fullP5-resumeP5)*100).toFixed(0)}pp P@5 提升`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
