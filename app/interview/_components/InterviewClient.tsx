"use client";

import { useCallback, useState } from "react";
import type { QuestionDTO } from "@/lib/interview/store";
import type { ActiveApplication } from "../page";
import CoachModal from "./CoachModal";

type View = "core" | "freq";

const CATEGORY_LABEL: Record<string, string> = {
  behavioral: "行為題",
  technical: "技術題",
  motivation: "動機題",
  situational: "情境題",
};
const CATEGORY_KEYS = ["behavioral", "technical", "motivation", "situational"] as const;

export default function InterviewClient({
  initialCore,
  initialAsked,
  initialWeeklyUses,
  activeApplications,
}: {
  initialCore: QuestionDTO[];
  initialAsked: QuestionDTO[];
  initialWeeklyUses: number;
  activeApplications: ActiveApplication[];
}) {
  const [core, setCore] = useState(initialCore);
  const [asked, setAsked] = useState(initialAsked);
  const [weeklyUses, setWeeklyUses] = useState(initialWeeklyUses);
  const [view, setView] = useState<View>("core");
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());

  // 教練彈框狀態
  const [modalQ, setModalQ] = useState<QuestionDTO | null>(null);
  // 新增題目彈框
  const [addOpen, setAddOpen] = useState(false);

  const preparedCount = core.filter((q) => q.prepared).length;
  const totalCore = core.length;
  const pct = totalCore ? Math.round((preparedCount / totalCore) * 100) : 0;

  const refresh = useCallback(async () => {
    const r = await fetch("/api/interview");
    if (!r.ok) return;
    const data = (await r.json()) as {
      core: QuestionDTO[];
      asked: QuestionDTO[];
      stats: { weeklyCoachUses: number };
    };
    setCore(data.core);
    setAsked(data.asked);
    setWeeklyUses(data.stats.weeklyCoachUses);
  }, []);

  const idOf = (q: QuestionDTO) => q.coreKey ?? q.id ?? q.question;

  function toggleItem(q: QuestionDTO) {
    if (!q.prepared) {
      void openCoach(q);
      return;
    }
    setOpenKeys((prev) => {
      const next = new Set(prev);
      const k = idOf(q);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  }

  // 進入教練：核心題用 coreKey（不存在則建立），其他用 questionId
  async function openCoach(q: QuestionDTO) {
    const body = q.coreKey ? { coreKey: q.coreKey } : { questionId: q.id };
    const r = await fetch("/api/interview/practice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) return;
    setModalQ((await r.json()) as QuestionDTO);
  }

  return (
    <div className="wrap">
      <h1>面試準備</h1>
      <p className="sub">把每場面試都會問的核心題練熟，磨好的答案會跟著你到每一場面試。</p>

      {activeApplications.length > 0 && (
        <div className="active-interviews">
          <div className="ai-label">進行中的面試（{activeApplications.length}）</div>
          <div className="ai-cards">
            {activeApplications.map((app) => (
              <div key={app.id} className="ai-card">
                <div className="ai-card-info">
                  <span className="ai-company">{app.companyName}</span>
                  <span className="ai-title">{app.title}{app.scheduledAt ? (
                    <span className="ai-date">・{new Date(app.scheduledAt).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" })} 面試</span>
                  ) : null}</span>
                </div>
                <a
                  href={`/board/${app.id}?tab=ai`}
                  className="ai-card-link"
                >
                  準備這場 →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="progress-row">
        <span className="pl">核心題準備度</span>
        <div className="bar">
          <i style={{ width: `${pct}%` }} />
        </div>
        <span className="pr">
          {preparedCount} / {totalCore}
        </span>
      </div>
      <div className="northstar">本週練習 {weeklyUses} 次</div>

      <div className="qtopbar">
        <div className="qbseg">
          <span className={view === "core" ? "on" : ""} onClick={() => setView("core")}>
            核心題
          </span>
          <span className={view === "freq" ? "on" : ""} onClick={() => setView("freq")}>
            常被問到
          </span>
        </div>
        <span style={{ flex: 1 }} />
        {view === "core" && (
          <button className="btn btn-sm" onClick={() => setAddOpen(true)}>
            <PlusIcon /> 新增題目
          </button>
        )}
      </div>

      {view === "core" ? (
        <CoreView
          core={core}
          openKeys={openKeys}
          idOf={idOf}
          onToggle={toggleItem}
          onPractice={openCoach}
        />
      ) : (
        <FreqView asked={asked} onPractice={openCoach} />
      )}

      {addOpen && (
        <AddQuestionModal
          onClose={() => setAddOpen(false)}
          onAdded={async () => {
            setAddOpen(false);
            await refresh();
          }}
        />
      )}

      {modalQ && (
        <CoachModal
          key={modalQ.id ?? modalQ.coreKey ?? "q"}
          question={modalQ}
          onClose={() => setModalQ(null)}
          onChanged={refresh}
          onWeeklyUse={() => setWeeklyUses((n) => n + 1)}
        />
      )}

      <style jsx global>{styles}</style>
    </div>
  );
}

/* ───────────────── 核心題視角 ───────────────── */
function CoreView({
  core,
  openKeys,
  idOf,
  onToggle,
  onPractice,
}: {
  core: QuestionDTO[];
  openKeys: Set<string>;
  idOf: (q: QuestionDTO) => string;
  onToggle: (q: QuestionDTO) => void;
  onPractice: (q: QuestionDTO) => void;
}) {
  return (
    <>
      <div className="qlist">
        {core.map((q) => {
          const open = openKeys.has(idOf(q));
          if (!q.prepared) {
            return (
              <div className="qitem" key={idOf(q)}>
                <div className="qhead" onClick={() => onPractice(q)}>
                  <span className="tri-sp" />
                  <div className="qmain">
                    <div className="qt">{q.question}</div>
                  </div>
                  <button
                    className="btn btn-sm btn-primary cta"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPractice(q);
                    }}
                  >
                    現在練
                  </button>
                </div>
              </div>
            );
          }
          const top = q.versions[0];
          return (
            <div className={`qitem${open ? " open" : ""}`} key={idOf(q)}>
              <div className="qhead" onClick={() => onToggle(q)}>
                <Tri />
                <div className="qmain">
                  <div className="qt">{q.question}</div>
                </div>
                <span className="rmeta">
                  <Check /> {q.versions.length} 版本
                </span>
              </div>
              <div className="qbody">
                <div className="qbody-top">
                  <span style={{ flex: 1 }} />
                  <button className="btn btn-sm" onClick={() => onPractice(q)}>
                    編輯
                  </button>
                </div>
                <div className="ans-view">{top?.content || "（此版本尚無內容）"}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="tip">
        <InfoIcon />
        <span>這些核心題的答案存起來後，之後每一場面試準備都會自動帶入，不用重寫。</span>
      </div>
    </>
  );
}

/* ───────────────── 常被問到視角 ───────────────── */
function FreqView({ asked, onPractice }: { asked: QuestionDTO[]; onPractice: (q: QuestionDTO) => void }) {
  if (asked.length === 0) {
    return (
      <div className="qlist">
        <div className="qrow" style={{ cursor: "default", color: "#888780" }}>
          <div className="qmain">
            <div className="qt" style={{ fontWeight: 400, color: "#888780" }}>
              還沒有被問到的紀錄
            </div>
            <div className="qmeta">面試後在復盤勾選「這題被問到了」，這裡就會長出你的個人考古題。</div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="qlist">
        {asked.map((q) => (
          <div className="qrow" key={q.id} onClick={() => onPractice(q)}>
            <span className="freq">
              {q.frequency ?? 1}
              <small>次</small>
            </span>
            <div className="qmain">
              <div className="qt">{q.question}</div>
              <div className="qmeta">
                {(q.askedCompanies && q.askedCompanies.length > 0 ? q.askedCompanies.join("・") + " 問過" : "曾被問到")}
                {" · "}
                {q.prepared ? "已有答案" : "還沒答案"}
              </div>
            </div>
            {q.prepared ? (
              <Chev />
            ) : (
              <button
                className="btn btn-sm btn-primary cta"
                onClick={(e) => {
                  e.stopPropagation();
                  onPractice(q);
                }}
              >
                現在練
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="tip">
        <InfoIcon />
        <span>面試後在復盤勾選「這題被問到了」，「常被問到」就會自動長出你的個人考古題——越面越準。</span>
      </div>
    </>
  );
}

/* ───────────────── 新增題目彈框 ───────────────── */
function AddQuestionModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("behavioral");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!q.trim()) return;
    setBusy(true);
    const r = await fetch("/api/interview/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q.trim(), category: cat }),
    });
    setBusy(false);
    if (r.ok) onAdded();
  }

  return (
    <div className="overlay on" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460, maxHeight: "none" }}>
        <div className="m-head">
          <button className="m-close" onClick={onClose}>
            <CloseIcon />
          </button>
          <div className="m-title" style={{ marginTop: 2 }}>
            新增題目
          </div>
        </div>
        <div style={{ padding: "18px 22px 22px" }}>
          <div className="lab">題目</div>
          <textarea
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minHeight: 72, flex: "none" }}
            placeholder="輸入你想練習的面試問題，例如：你為什麼想離開上一份工作？"
          />
          <div className="lab" style={{ marginTop: 14 }}>
            題型
          </div>
          <div className="seg" style={{ flexWrap: "wrap" }}>
            {CATEGORY_KEYS.map((k) => (
              <span key={k} className={cat === k ? "on" : ""} onClick={() => setCat(k)}>
                {CATEGORY_LABEL[k]}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
            <button className="btn btn-sm" onClick={onClose}>
              取消
            </button>
            <button className="btn btn-sm btn-primary" onClick={add} disabled={busy}>
              {busy ? "新增中…" : "新增"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── icons ───────────────── */
const Tri = () => (
  <svg className="tri" viewBox="0 0 24 24">
    <polyline points="9 6 15 12 9 18" />
  </svg>
);
const Check = () => (
  <svg className="rcheck" viewBox="0 0 24 24">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const Chev = () => (
  <svg className="chev" viewBox="0 0 24 24">
    <polyline points="9 6 15 12 9 18" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const PlusIcon = ({ small }: { small?: boolean }) => (
  <svg
    width={small ? 13 : 13}
    height={small ? 13 : 13}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    style={{ display: "inline-block", verticalAlign: -2, marginRight: small ? 0 : 4 }}
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const InfoIcon = ({ small }: { small?: boolean }) => (
  <svg width={small ? 13 : 16} height={small ? 13 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
  </svg>
);
const CloseIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
  </svg>
);
/* ───────────────── styles (ported from mockup) ───────────────── */
const styles = `
  .wrap{max-width:1040px;margin:0 auto;padding:28px 36px 80px;color:#1a1a18;font-size:14px;line-height:1.55}
  h1{font-size:24px;font-weight:700;letter-spacing:-.015em}
  .sub{color:#888780;font-size:13.5px;margin-top:6px}
  .active-interviews{background:#E1F5EE;border-radius:14px;padding:16px 18px;margin:20px 0 24px}
  .ai-label{font-size:12px;font-weight:600;color:#0f6e56;margin-bottom:12px}
  .ai-cards{display:flex;flex-wrap:wrap;gap:10px}
  .ai-card{background:#fff;border-radius:11px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:16px;min-width:260px;flex:1}
  .ai-card-info{display:flex;flex-direction:column;gap:2px;min-width:0}
  .ai-company{font-size:14px;font-weight:700;color:#1a1a18;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ai-title{font-size:12px;color:#888780;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ai-date{color:#888780}
  .ai-card-link{font-size:13px;font-weight:600;color:#0f6e56;white-space:nowrap;text-decoration:none;flex-shrink:0}
  .ai-card-link:hover{text-decoration:underline}
  .progress-row{display:flex;align-items:center;gap:14px;margin:28px 0 8px}
  .progress-row .pl{font-size:13px;color:#1a1a18;font-weight:600;white-space:nowrap}
  .bar{flex:1;height:6px;background:#eeece6;border-radius:999px;overflow:hidden}
  .bar > i{display:block;height:100%;background:#0f6e56;border-radius:999px;transition:width .3s}
  .progress-row .pr{font-size:12px;color:#888780;white-space:nowrap}
  .northstar{font-size:12px;color:#aaa8a0;margin-bottom:22px}

  .qtopbar{display:flex;align-items:center;margin-bottom:14px}
  .qbseg{display:inline-flex;background:#eeece6;border-radius:9px;padding:3px;gap:2px}
  .qbseg span{font-size:12.5px;font-weight:600;padding:7px 16px;border-radius:7px;color:#888780;cursor:pointer}
  .qbseg span.on{background:#fff;color:#1a1a18;box-shadow:0 1px 2px rgba(0,0,0,.05)}

  .qlist{background:#fff;border:1px solid #e8e6df;border-radius:14px;overflow:hidden}
  .qitem{border-bottom:1px solid #efece5}
  .qitem:last-child{border-bottom:none}
  .qhead{display:flex;align-items:center;gap:12px;padding:16px 18px;cursor:pointer;transition:background .15s}
  .qhead:hover{background:#faf9f5}
  .tri{width:12px;height:12px;stroke:#888780;fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0;transition:transform .18s}
  .qitem.open .tri{transform:rotate(90deg)}
  .tri-sp{width:12px;flex-shrink:0}
  .qmain{flex:1;min-width:0}
  .qt{font-size:15px;color:#1a1a18;font-weight:500;line-height:1.45}
  .rmeta{display:flex;align-items:center;gap:5px;font-size:12px;color:#888780;white-space:nowrap;flex-shrink:0}
  .rcheck{width:14px;height:14px;stroke:#0f6e56;fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
  .cta{flex-shrink:0}

  .qbody{display:none;padding:2px 18px 18px 18px}
  .qitem.open .qbody{display:block}
  .qbody-top{display:flex;align-items:center;gap:8px;margin-bottom:10px}
  .ans-view{background:transparent;border:1px solid #e8e6df;border-radius:10px;padding:11px 13px;font-size:13.5px;color:#555552;line-height:1.85;white-space:pre-wrap}

  .seg{display:inline-flex;background:#eeece6;border-radius:9px;padding:3px;gap:2px;flex-wrap:wrap}
  .seg span{font-size:12px;font-weight:600;padding:6px 13px;border-radius:7px;color:#888780;cursor:pointer}
  .seg span.on{background:#fff;color:#1a1a18;box-shadow:0 1px 2px rgba(0,0,0,.05)}

  .qrow{display:flex;align-items:center;gap:13px;padding:15px 18px;border-bottom:1px solid #efece5;cursor:pointer;transition:background .15s}
  .qrow:last-child{border-bottom:none}
  .qrow:hover{background:#faf9f5}
  .freq{display:flex;flex-direction:column;align-items:center;justify-content:center;width:38px;height:38px;border-radius:10px;background:#eeece6;color:#1a1a18;font-weight:700;font-size:15px;flex-shrink:0;line-height:1}
  .freq small{font-size:9px;color:#888780;font-weight:500;margin-top:1px}
  .qmeta{font-size:12px;color:#888780;margin-top:3px}
  .chev{width:16px;height:16px;stroke:#888780;fill:none;stroke-width:1.8;flex-shrink:0}

  .tip{display:flex;gap:9px;font-size:12.5px;color:#9a6a1c;background:#fbf4e7;border:1px solid #efe3cb;border-radius:11px;padding:12px 14px;margin-top:18px;line-height:1.6}
  .tip svg{width:16px;height:16px;stroke:#9a6a1c;fill:none;stroke-width:1.8;flex-shrink:0;margin-top:1px}

  .btn{font-size:13px;font-weight:500;padding:8px 14px;border-radius:9px;cursor:pointer;border:1px solid #e2ddd0;background:#f4f1ea;color:#1a1a18;transition:background .15s}
  .btn:hover{background:#eeece6}
  .btn:disabled{opacity:.55;cursor:default}
  .btn-primary{background:#e6e0d2;color:#1a1a18;border-color:#d8d1c0;font-weight:600}
  .btn-primary:hover{background:#ded7c6}
  .btn-sm{font-size:12px;padding:6px 13px;border-radius:8px}

  .lab{font-size:12px;font-weight:600;color:#1a1a18;margin-bottom:7px}
  textarea{width:100%;flex:1;border:1px solid #e8e6df;border-radius:11px;padding:13px 14px;font:inherit;font-size:14px;line-height:1.7;resize:vertical;color:#1a1a18;background:#fff;min-height:260px}
  textarea:focus{outline:none;border-color:#aaa8a0}
`;
