"use client";

// 教練練習彈框：版本管理、AI 初稿、教練評估、回饋顯示。
// 從 InterviewClient 抽出成獨立可重用元件（核心題庫 /interview 與申請詳情面試準備分頁共用）。
// 樣式：自帶 global style 區塊，故不依賴宿主頁面既有的 styles 字串即可正常呈現。
import { useState } from "react";
import type { QuestionDTO, VersionDTO } from "@/lib/interview/store";
import type { CoachResult } from "@/lib/interview/coach";

const CATEGORY_LABEL: Record<string, string> = {
  behavioral: "行為題",
  technical: "技術題",
  motivation: "動機題",
  situational: "情境題",
};

const GRADE_LABEL: Record<string, string> = {
  needs_improvement: "待加強",
  ok: "可",
  good: "優秀",
};

export default function CoachModal({
  question,
  onClose,
  onChanged,
  onWeeklyUse,
}: {
  question: QuestionDTO;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
  onWeeklyUse?: () => void;
}) {
  const [versions, setVersions] = useState<VersionDTO[]>(question.versions);
  const [activeId, setActiveId] = useState<string>(question.versions[0]?.id ?? "");
  const active = versions.find((v) => v.id === activeId) ?? versions[0];

  const [answer, setAnswer] = useState<string>(active?.content ?? "");
  const [coaching, setCoaching] = useState<CoachResult | null>(active?.lastCoaching ?? null);
  const [busy, setBusy] = useState<"" | "draft" | "save" | "eval">("");
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  function selectVersion(v: VersionDTO) {
    setActiveId(v.id);
    setAnswer(v.content);
    setCoaching(v.lastCoaching ?? null);
    setErr("");
    setSaved(false);
  }

  function patchActive(patch: Partial<VersionDTO>) {
    setVersions((vs) => vs.map((v) => (v.id === activeId ? { ...v, ...patch } : v)));
  }

  async function save() {
    if (!active) return;
    setBusy("save");
    setErr("");
    const r = await fetch(`/api/interview/versions/${active.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: answer }),
    });
    setBusy("");
    if (r.ok) {
      patchActive({ content: answer });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      await onChanged();
    } else {
      setErr("儲存失敗");
    }
  }

  async function draft() {
    if (!question.id) return;
    setBusy("draft");
    setErr("");
    const r = await fetch("/api/interview/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: question.id }),
    });
    setBusy("");
    if (r.ok) {
      const { draft } = (await r.json()) as { draft: string };
      setAnswer(draft);
    } else {
      const e = (await r.json().catch(() => ({}))) as { error?: string };
      setErr(e.error ?? "初稿生成失敗");
    }
  }

  async function evaluate() {
    if (!active) return;
    if (answer.trim().length < 10) {
      setErr("先寫幾句再請教練評估");
      return;
    }
    setBusy("eval");
    setErr("");
    const r = await fetch("/api/interview/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionId: active.id, answer }),
    });
    setBusy("");
    if (r.ok) {
      const result = (await r.json()) as CoachResult;
      setCoaching(result);
      patchActive({ content: answer, grade: result.grade, lastCoaching: result });
      onWeeklyUse?.();
      await onChanged();
    } else {
      const e = (await r.json().catch(() => ({}))) as { error?: string };
      setErr(e.error ?? "評估失敗");
    }
  }

  async function addVersion() {
    if (!question.id) return;
    const label = window.prompt("版本名稱（例如：1分鐘、給新創的版本）", "新版本");
    if (label === null) return;
    const r = await fetch("/api/interview/versions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: question.id, label }),
    });
    if (r.ok) {
      const v = (await r.json()) as VersionDTO;
      setVersions((vs) => [...vs, v]);
      selectVersion(v);
      await onChanged();
    }
  }

  async function deleteVersion() {
    if (!active || versions.length <= 1) return;
    if (!window.confirm(`刪除版本「${active.label}」？`)) return;
    const r = await fetch(`/api/interview/versions/${active.id}`, { method: "DELETE" });
    if (r.ok) {
      const remaining = versions.filter((v) => v.id !== active.id);
      setVersions(remaining);
      selectVersion(remaining[0]);
      await onChanged();
    }
  }

  async function deleteQuestion() {
    if (!question.id) return;
    if (!window.confirm("確定刪除這題？磨好的所有版本都會一起刪除。")) return;
    const r = await fetch(`/api/interview/questions/${question.id}`, { method: "DELETE" });
    if (r.ok) {
      onClose();
      await onChanged();
    }
  }

  const evaluated = coaching !== null;

  return (
    <div className="overlay on" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="m-head">
          <button className="m-close" onClick={onClose}>
            <CloseIcon />
          </button>
          <div className="m-eyebrow">
            {question.isCore ? "核心題" : "常被問到"} · {CATEGORY_LABEL[question.category] ?? "面試題"} ·{" "}
            {question.prepared ? "已備" : "草稿"}
          </div>
          <div className="m-titlerow">
            <div className="m-title">{question.question}</div>
            {question.isCore && question.coreKey === null && (
              <span className="link-act danger" onClick={deleteQuestion} style={{ whiteSpace: "nowrap" }}>
                刪除題目
              </span>
            )}
          </div>
        </div>

        <div className="m-cols">
          {/* 左：我的答案 */}
          <div className="col-left">
            <div className="vbar">
              <div className="seg">
                {versions.map((v) => (
                  <span key={v.id} className={v.id === activeId ? "on" : ""} onClick={() => selectVersion(v)}>
                    {v.label}
                  </span>
                ))}
              </div>
              <span className="vadd" onClick={addVersion}>
                <PlusIcon small /> 版本
              </span>
              {versions.length > 1 && (
                <span className="link-act danger" onClick={deleteVersion} style={{ fontSize: 11.5 }}>
                  刪此版
                </span>
              )}
            </div>

            <div className="lab">
              我的答案
              {question.id && (
                <span
                  className="note"
                  style={{ cursor: "pointer" }}
                  onClick={busy ? undefined : draft}
                >
                  {busy === "draft" ? "生成初稿中…" : "✦ 讓 AI 生一版初稿"}
                </span>
              )}
            </div>
            <textarea
              value={answer}
              onChange={(e) => {
                setAnswer(e.target.value);
                setSaved(false);
              }}
              placeholder="把你的答案寫在這裡，再請教練幫你磨。"
            />
            {question.hint && (
              <div className="mini-tip">
                <InfoIcon small />
                <span>{question.hint}</span>
              </div>
            )}
            {err && <div className="mini-tip" style={{ color: "#a32d2d" }}>{err}</div>}
            <div className="left-actions">
              <button className="btn" onClick={save} disabled={busy !== ""}>
                {saved ? "已儲存 ✓" : busy === "save" ? "儲存中…" : "儲存"}
              </button>
              <button className="btn btn-primary" onClick={evaluate} disabled={busy !== ""}>
                {busy === "eval" ? "教練思考中…" : evaluated ? "重新評估" : "請教練評估"}
              </button>
            </div>
          </div>

          {/* 右：教練回饋 */}
          <div className="col-right">
            <div className="rt">教練回饋</div>
            {!coaching ? (
              <div className="empty">
                <ChatIcon />
                <p>寫好左邊的答案後，按「請教練評估」，建議會出現在這裡。</p>
              </div>
            ) : (
              <Feedback result={coaching} />
            )}
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: modalStyles }} />
    </div>
  );
}

function Feedback({ result }: { result: CoachResult }) {
  const gradeClass = result.grade === "good" ? "good" : result.grade === "ok" ? "ok" : "bad";
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div className="grade-line">
        <span className={`grade ${gradeClass}`}>教練評等：{GRADE_LABEL[result.grade] ?? result.grade}</span>
        <span className="gsub">{result.summary}</span>
      </div>

      {result.strengths.length > 0 && (
        <div className="fb-group">
          <div className="gt">做得好</div>
          {result.strengths.map((s, i) => (
            <div className="fb-li" key={i}>
              <CheckSmall /> <span>{s}</span>
            </div>
          ))}
        </div>
      )}

      {result.improvements.length > 0 && (
        <div className="fb-group">
          <div className="gt">可以更好</div>
          {result.improvements.map((imp, i) => (
            <div key={i}>
              <div className="fb-li">
                <ArrowSmall />
                <span>
                  <b>{imp.issue}：</b>
                  {imp.suggestion}
                </span>
              </div>
              {imp.example && (
                <div className="fb-eg">
                  <b>示範</b>
                  {imp.example}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {result.structure.length > 0 && (
        <div className="fb-group">
          <div className="gt">結構檢查</div>
          <div className="chips">
            {result.structure.map((s, i) => (
              <span key={i} className={`chip ${s.ok ? "y" : "n"}`}>
                {s.label} {s.ok ? "✓" : "待強化"}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────── icons ───────────────── */
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
const ChatIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M4 5h16v11H9l-4 3v-3H4z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const CheckSmall = () => (
  <svg className="ic-good" viewBox="0 0 24 24">
    <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ArrowSmall = () => (
  <svg className="ic-imp" viewBox="0 0 24 24">
    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ───────────────── styles ─────────────────
   自帶樣式：涵蓋 modal 版面 + modal 內用到的共用元件（btn/seg/lab/textarea/link-act）。
   在 /interview 頁與 InterviewClient 的 styles 有重疊的 class（規則相同），無害；
   在申請詳情面試準備分頁則靠這份樣式獨立呈現。全部暖色系，無藍色。 */
const modalStyles = `
  .overlay{position:fixed;inset:0;background:rgba(26,26,24,.42);display:flex;padding:44px 16px;z-index:100;overflow-y:auto}
  .modal{background:#fff;border-radius:18px;width:100%;max-width:880px;margin:auto;max-height:calc(100vh - 56px);display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,.2);overflow:hidden;color:#1a1a18;font-size:14px;line-height:1.55;text-align:left}
  .modal .m-head{padding:20px 24px 16px;border-bottom:1px solid #efece5;position:relative;flex-shrink:0}
  .modal .m-eyebrow{font-size:11.5px;color:#aaa8a0;font-weight:600;letter-spacing:.03em}
  .modal .m-title{font-size:18px;font-weight:700;line-height:1.4}
  .modal .m-titlerow{display:flex;align-items:center;gap:12px;margin-top:5px;padding-right:30px}
  .modal .m-close{position:absolute;top:18px;right:20px;cursor:pointer;border:none;background:none;padding:4px}
  .modal .m-close svg{width:18px;height:18px;stroke:#888780;fill:none;stroke-width:2}

  .modal .m-cols{display:flex;flex:1;min-height:380px;overflow:hidden}
  .modal .col-left{flex:1;padding:20px 22px;border-right:1px solid #efece5;display:flex;flex-direction:column;overflow-y:auto}
  .modal .col-right{flex:1;padding:20px 22px;display:flex;flex-direction:column;overflow-y:auto}

  .modal .vbar{display:flex;align-items:center;gap:10px;margin-bottom:14px}
  .modal .vadd{font-size:12px;color:#555552;cursor:pointer;display:flex;align-items:center;gap:3px}
  .modal .lab{font-size:12px;font-weight:600;color:#1a1a18;margin-bottom:7px}
  .modal .lab .note{font-weight:400;color:#9a6a1c;font-size:11.5px;margin-left:8px}
  .modal textarea{width:100%;flex:1;border:1px solid #e8e6df;border-radius:11px;padding:13px 14px;font:inherit;font-size:14px;line-height:1.7;resize:vertical;color:#1a1a18;background:#fff;min-height:260px}
  .modal textarea:focus{outline:none;border-color:#aaa8a0}
  .modal .mini-tip{display:flex;gap:7px;align-items:flex-start;font-size:11.5px;color:#888780;line-height:1.5;margin-top:10px}
  .modal .mini-tip svg{width:13px;height:13px;stroke:#aaa8a0;fill:none;stroke-width:1.7;flex-shrink:0;margin-top:1px}
  .modal .left-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}

  .modal .seg{display:inline-flex;background:#eeece6;border-radius:9px;padding:3px;gap:2px;flex-wrap:wrap}
  .modal .seg span{font-size:12px;font-weight:600;padding:6px 13px;border-radius:7px;color:#888780;cursor:pointer}
  .modal .seg span.on{background:#fff;color:#1a1a18;box-shadow:0 1px 2px rgba(0,0,0,.05)}

  .modal .btn{font-size:13px;font-weight:500;padding:8px 14px;border-radius:9px;cursor:pointer;border:1px solid #e2ddd0;background:#f4f1ea;color:#1a1a18;transition:background .15s}
  .modal .btn:hover{background:#eeece6}
  .modal .btn:disabled{opacity:.55;cursor:default}
  .modal .btn-primary{background:#e6e0d2;color:#1a1a18;border-color:#d8d1c0;font-weight:600}
  .modal .btn-primary:hover{background:#ded7c6}

  .modal .col-right .rt{font-size:12px;font-weight:700;color:#aaa8a0;letter-spacing:.03em;margin-bottom:14px}
  .modal .empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#aaa8a0;gap:10px;padding:20px}
  .modal .empty svg{width:30px;height:30px;stroke:#aaa8a0;fill:none;stroke-width:1.5}
  .modal .empty p{font-size:12.5px;line-height:1.6;max-width:200px}

  .modal .grade-line{display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap}
  .modal .grade{font-size:14px;font-weight:700}
  .modal .grade.ok{color:#9a6a1c}.modal .grade.good{color:#0f6e56}.modal .grade.bad{color:#a32d2d}
  .modal .grade-line .gsub{font-size:12px;color:#888780}
  .modal .fb-group{margin-bottom:15px}
  .modal .fb-group .gt{font-size:12px;font-weight:700;color:#555552;margin-bottom:8px}
  .modal .fb-li{display:flex;gap:9px;font-size:13px;color:#555552;line-height:1.6;margin-bottom:7px}
  .modal .fb-li svg{width:15px;height:15px;flex-shrink:0;margin-top:2px;fill:none;stroke-width:1.9}
  .modal .fb-li .ic-good{stroke:#0f6e56}.modal .fb-li .ic-imp{stroke:#9a6a1c}
  .modal .fb-li b{color:#1a1a18}
  .modal .fb-eg{font-size:12px;color:#555552;background:#f4f1ea;border-left:2px solid #d8d1c0;border-radius:0 7px 7px 0;padding:7px 11px;margin:5px 0 11px 24px;line-height:1.65}
  .modal .fb-eg b{color:#888780;font-weight:700;font-size:10.5px;letter-spacing:.04em;margin-right:6px}
  .modal .chips{display:flex;gap:6px;flex-wrap:wrap}
  .modal .chip{font-size:11.5px;padding:4px 10px;border-radius:7px;font-weight:600}
  .modal .chip.y{background:#e6f1ea;color:#0f6e56}.modal .chip.n{background:#f6ebea;color:#a32d2d}

  .modal .link-act{font-size:12px;color:#555552;cursor:pointer}
  .modal .link-act:hover{color:#1a1a18}
  .modal .link-act.danger{color:#a32d2d}

  @media (max-width:720px){ .modal .m-cols{flex-direction:column} .modal .col-left{border-right:none;border-bottom:1px solid #efece5} }
`;
