// 面試準備資料層（server-only）：組裝教練 context、確保核心題存在、序列化給前端。
// 約定：isCore=true = 我主動準備的題（策展核心題 coreKey 有值；自訂題 coreKey=null）。
//       isCore=false = 從真實面試復盤捕捉到的題（「常被問到」視角，依 frequency 排序）。
import { prisma } from "@/lib/db/client";
import { CORE_QUESTIONS, type CoreQuestion } from "@/lib/interview/core-questions";
import type { CoachResult } from "@/lib/interview/coach";

export interface VersionDTO {
  id: string;
  label: string;
  content: string;
  grade: string | null;
  score: number | null;
  lastCoaching: CoachResult | null;
  updatedAt: string;
}

export interface QuestionDTO {
  id: string | null; // QuestionBank id；核心題未練過時為 null
  coreKey: string | null;
  question: string;
  category: string;
  hint: string | null;
  isCore: boolean;
  prepared: boolean; // 是否已有任一含內容的版本
  versions: VersionDTO[];
  frequency?: number; // 常被問到視角用
  askedCompanies?: string[];
}

const coreByKey = new Map<string, CoreQuestion>(CORE_QUESTIONS.map((q) => [q.coreKey, q]));

function versionDTO(v: {
  id: string;
  label: string;
  content: string;
  grade: string | null;
  score: number | null;
  lastCoaching: unknown;
  updatedAt: Date;
}): VersionDTO {
  return {
    id: v.id,
    label: v.label,
    content: v.content,
    grade: v.grade,
    score: v.score,
    lastCoaching: (v.lastCoaching as CoachResult | null) ?? null,
    updatedAt: v.updatedAt.toISOString(),
  };
}

// id 作為穩定 tiebreaker：兩個預設版本可能同毫秒建立，純 createdAt 排序不穩定。
// cuid 單調遞增，故 createdAt→id 排序既穩定又保留 seed 順序（30秒 先於 1分鐘）。
const qbInclude = { versions: { orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }] } };

type QbWithVersions = {
  id: string;
  coreKey: string | null;
  question: string;
  category: string;
  frequency: number;
  lastAskedCompanies: unknown;
  versions: Parameters<typeof versionDTO>[0][];
};

function serialize(qb: QbWithVersions, opts: { isCore: boolean; hint?: string | null }): QuestionDTO {
  const versions = qb.versions.map(versionDTO);
  return {
    id: qb.id,
    coreKey: qb.coreKey,
    question: qb.question,
    category: qb.category,
    hint: opts.hint ?? (qb.coreKey ? coreByKey.get(qb.coreKey)?.hint ?? null : null),
    isCore: opts.isCore,
    prepared: versions.some((v) => v.content.trim().length > 0),
    versions,
    frequency: qb.frequency,
    askedCompanies: Array.isArray(qb.lastAskedCompanies) ? (qb.lastAskedCompanies as string[]) : [],
  };
}

/** 把履歷 + 經歷組成教練/初稿用的背景摘要字串。 */
export async function buildResumeContext(userId: string): Promise<string> {
  const [resume, experiences] = await Promise.all([
    prisma.resume.findUnique({
      where: { userId },
      select: { title: true, seniority: true, industry: true, skills: true, yearsExperience: true },
    }),
    prisma.workExperience.findMany({
      where: { userId },
      orderBy: { order: "asc" },
      select: { type: true, company: true, role: true, description: true },
    }),
  ]);

  const parts: string[] = [];
  if (resume) {
    const meta = [
      resume.title && `定位：${resume.title}`,
      resume.seniority && `資歷：${resume.seniority}`,
      resume.industry && `產業：${resume.industry}`,
      resume.yearsExperience != null && `年資：${resume.yearsExperience} 年`,
      Array.isArray(resume.skills) && resume.skills.length > 0 && `技能：${(resume.skills as string[]).join("、")}`,
    ].filter(Boolean);
    if (meta.length) parts.push(meta.join("｜"));
  }
  for (const e of experiences) {
    parts.push(`[${e.type}] ${e.company}・${e.role}：${e.description.slice(0, 300)}`);
  }
  return parts.join("\n");
}

/** 核心題視角：策展 seed 題 merge 使用者已建立的 isCore 題（含 coreKey 與自訂 coreKey=null）。 */
export async function listCoreQuestions(userId: string): Promise<QuestionDTO[]> {
  const rows = (await prisma.questionBank.findMany({
    where: { userId, isCore: true },
    include: qbInclude,
  })) as unknown as QbWithVersions[];

  const byKey = new Map<string, QbWithVersions>();
  const customs: QbWithVersions[] = [];
  for (const r of rows) {
    if (r.coreKey) byKey.set(r.coreKey, r);
    else customs.push(r);
  }

  const seeded: QuestionDTO[] = CORE_QUESTIONS.map((cq) => {
    const existing = byKey.get(cq.coreKey);
    if (existing) return serialize(existing, { isCore: true, hint: cq.hint });
    return {
      id: null,
      coreKey: cq.coreKey,
      question: cq.question,
      category: cq.category,
      hint: cq.hint,
      isCore: true,
      prepared: false,
      versions: [],
    };
  });

  const customDTO = customs
    .sort((a, b) => a.question.localeCompare(b.question))
    .map((c) => serialize(c, { isCore: true }));

  return [...seeded, ...customDTO];
}

/** 常被問到視角：從復盤捕捉的題（isCore=false），依被問次數排序。 */
export async function listAskedQuestions(userId: string): Promise<QuestionDTO[]> {
  const rows = (await prisma.questionBank.findMany({
    where: { userId, isCore: false },
    include: qbInclude,
    orderBy: [{ frequency: "desc" }, { updatedAt: "desc" }],
  })) as unknown as QbWithVersions[];
  return rows.map((r) => serialize(r, { isCore: false }));
}

/** 確保某核心題在 DB 有 QuestionBank 列（首次練習時建立 + 預設版本），回傳序列化結果。 */
export async function ensureCoreQuestion(userId: string, coreKey: string): Promise<QuestionDTO> {
  const cq = coreByKey.get(coreKey);
  if (!cq) throw new Error(`unknown coreKey: ${coreKey}`);

  const existing = (await prisma.questionBank.findUnique({
    where: { userId_coreKey: { userId, coreKey } },
    include: qbInclude,
  })) as unknown as QbWithVersions | null;
  if (existing) return serialize(existing, { isCore: true, hint: cq.hint });

  const created = (await prisma.questionBank.create({
    data: {
      userId,
      coreKey,
      question: cq.question,
      category: cq.category,
      isCore: true,
      versions: { create: cq.defaultVersions.map((label) => ({ label })) },
    },
    include: qbInclude,
  })) as unknown as QbWithVersions;
  return serialize(created, { isCore: true, hint: cq.hint });
}

/** 讀取單一已存在題（含版本），驗證擁有者。 */
export async function getQuestion(userId: string, id: string): Promise<QuestionDTO | null> {
  const qb = (await prisma.questionBank.findUnique({
    where: { id },
    include: qbInclude,
  })) as unknown as (QbWithVersions & { userId: string; isCore: boolean }) | null;
  if (!qb || qb.userId !== userId) return null;
  return serialize(qb, { isCore: qb.isCore });
}
