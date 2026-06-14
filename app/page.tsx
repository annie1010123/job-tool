import Link from "next/link";

/* ── 小圖示（SVG，不用 emoji 當結構圖示）── */
function Check({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden width="16" height="16">
      <path d="M4 10.5l3.5 3.5L16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden width="16" height="16">
      <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const PAINS = [
  "104 滑不完，不知道哪些職缺真的適合自己",
  "投了十幾間，記不住投到哪、誰回了、該追誰",
  "面試前才臨時抱佛腳，上一次的經驗沒留下來",
];

const STEPS = [
  {
    no: "01",
    tag: "讀懂你",
    title: "上傳履歷 + 設定求職意圖",
    desc: "AI 用語意理解你的背景與目標，不是死板的關鍵字比對——所以推薦的是「真的適合」，不是「字面上有」。",
  },
  {
    no: "02",
    tag: "每天幫你挑",
    title: "每天收到 AI 推薦職缺 + 一鍵推薦信",
    desc: "每天自動從 104 篩出最 match 的職缺，附上相符度與推薦理由；想投的話，一鍵生成客製化推薦信。",
  },
  {
    no: "03",
    tag: "陪你到面試",
    title: "全程追蹤 + AI 面試準備越練越強",
    desc: "從投遞、面試到結果一個看板管好；面試前 AI 根據職缺與你的歷史出題，每練一次就更準。",
  },
];

export default async function Home() {
  return (
    <div className="min-h-dvh bg-[#f4f2ec] text-[#1a1a18] antialiased">
      {/* ── Nav ── */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <span className="text-[17px] font-bold tracking-tight">JobPilot</span>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link href="/login" className="rounded-lg px-3 py-2 text-sm text-[#5f5e5a] transition-colors hover:text-[#1a1a18]">
            登入
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-[#1a1a18] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#333]"
          >
            免費開始
          </Link>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:pb-24 lg:pt-14">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-[#5f5e5a]">
            為求職的學生與新鮮人打造
          </span>
          <h1 className="mt-5 text-[2.4rem] font-bold leading-[1.15] tracking-tight sm:text-[3.1rem]">
            每天 AI 幫你挑好職缺，
            <br className="hidden sm:block" />
            <span className="text-[#0f6e56]">面試越練越強。</span>
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-[#5f5e5a] sm:text-base">
            別再自己滑 104 滑到眼花。JobPilot 讀懂你的履歷與求職意圖，每天語意推薦最適合的職缺、一鍵生成推薦信，
            再從投遞到面試全程陪跑——像有個求職教練隨時在旁邊。
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-[#1a1a18] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#333]"
            >
              免費開始求職 <Arrow />
            </Link>
            <a
              href="#how"
              className="inline-flex items-center rounded-xl border border-black/15 bg-white px-6 py-3 text-sm font-semibold text-[#1a1a18] transition-colors hover:border-black/30"
            >
              看 JobPilot 怎麼運作
            </a>
          </div>

          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-[#888780]">
            {["永久免費方案", "不需信用卡", "30 秒上手"].map((t) => (
              <li key={t} className="inline-flex items-center gap-1.5">
                <Check className="text-[#0f6e56]" /> {t}
              </li>
            ))}
          </ul>
        </div>

        {/* 產品 mockup：推薦職缺卡片 */}
        <div className="relative">
          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.25)]">
            <div className="flex items-center justify-between text-xs text-[#888780]">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-[#0f6e56]" /> 今日推薦
              </span>
              <span>1 / 12</span>
            </div>
            <div className="mt-4 flex items-start justify-between gap-3">
              <div>
                <div className="text-[15px] font-semibold leading-snug">產品經理實習生 Product Manager Intern</div>
                <div className="mt-1 text-[13px] text-[#5f5e5a]">行動貝果有限公司 · 台北市信義區</div>
              </div>
              <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-full bg-[#E1F5EE] text-[#0f6e56]">
                <span className="text-sm font-bold leading-none">92%</span>
                <span className="text-[9px] leading-none">相符</span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {["PRD", "需求分析", "Agile", "跨部門溝通"].map((s) => (
                <span key={s} className="rounded-md bg-[#f0efe9] px-2.5 py-1 text-[11px] text-[#5f5e5a]">
                  {s}
                </span>
              ))}
            </div>
            <div className="mt-4 rounded-xl bg-[#faf9f6] p-3 text-[12.5px] leading-6 text-[#5f5e5a]">
              <span className="font-semibold text-[#1a1a18]">AI 推薦理由 ·</span>{" "}
              職務聚焦產品規格與跨部門協作，與你「想做 0→1 產品」的意圖高度吻合，技能也對得上。
            </div>
            <div className="mt-4 flex gap-2.5">
              <button className="flex-1 rounded-xl border border-black/12 bg-white py-2.5 text-sm font-medium text-[#888780]">
                略過
              </button>
              <button className="flex-1 rounded-xl bg-[#0f6e56] py-2.5 text-sm font-semibold text-white">
                投遞
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 來源列 ── */}
      <section className="border-y border-black/5 bg-[#faf9f6]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-5 py-4 text-[13px] text-[#888780] sm:px-8">
          <span>每天自動從</span>
          <span className="rounded-md bg-[#E1F5EE] px-2 py-0.5 text-xs font-semibold text-[#0f6e56]">104 人力銀行</span>
          <span>為你更新職缺，用 AI 語意比對你的履歷與意圖。</span>
        </div>
      </section>

      {/* ── 痛點 ── */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#888780]">為什麼需要 JobPilot</p>
        <h2 className="mt-3 max-w-2xl text-[1.8rem] font-bold leading-snug tracking-tight sm:text-[2.2rem]">
          找工作本來就很累，
          <br />
          不該再累在這些事上。
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {PAINS.map((p, i) => (
            <div key={i} className="rounded-2xl border border-black/8 bg-white p-6">
              <span className="text-sm font-semibold text-[#D85A30]">0{i + 1}</span>
              <p className="mt-3 text-[15px] leading-7 text-[#3d3d3a]">{p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 三步驟 ── */}
      <section id="how" className="scroll-mt-8 bg-[#faf9f6] py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 text-center sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#888780]">JobPilot 怎麼運作</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-[1.9rem] font-bold leading-snug tracking-tight sm:text-[2.4rem]">
            三步驟，搞定整段求職
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-[#5f5e5a]">
            從找職缺、投遞到面試準備，每一步都讓 AI 幫你省力。
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-6xl gap-5 px-5 sm:px-8 lg:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.no} className="rounded-2xl border border-black/8 bg-white p-7">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-[#1a1a18]">{s.no}</span>
                <span className="rounded-full bg-[#f0efe9] px-2.5 py-1 text-xs font-medium text-[#5f5e5a]">{s.tag}</span>
              </div>
              <h3 className="mt-4 text-[17px] font-semibold leading-snug">{s.title}</h3>
              <p className="mt-2.5 text-[14px] leading-7 text-[#5f5e5a]">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 最終 CTA（綠色卡片）── */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
        <div className="rounded-[28px] bg-[#dff0e6] px-6 py-14 text-center sm:px-8 sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#0f6e56]/15 bg-white px-3.5 py-1.5 text-xs font-medium text-[#0f6e56]">
            求職路上，有 AI 罩你
          </span>
          <h2 className="mx-auto mt-6 max-w-2xl text-[2rem] font-bold leading-tight tracking-tight text-[#16261f] sm:text-[2.8rem]">
            別再一個人埋頭找工作。
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-7 text-[#3d4a44] sm:text-base">
            讓 JobPilot 幫你挑職缺、追進度、練面試，把時間留給真正重要的事——準備面試，拿下 Offer。
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-[#1a1a18] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#333]"
            >
              免費開始求職 <Arrow />
            </Link>
            <a
              href="#how"
              className="inline-flex items-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#1a1a18] transition-transform hover:scale-[1.02]"
            >
              了解更多功能
            </a>
          </div>
          <ul className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-[13px] text-[#5a6b63]">
            {["永久免費方案", "不需信用卡", "30 秒上手"].map((t) => (
              <li key={t} className="inline-flex items-center gap-1.5">
                <Check className="text-[#0f6e56]" /> {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-black/5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-[13px] text-[#888780] sm:flex-row sm:px-8">
          <span className="font-semibold text-[#5f5e5a]">JobPilot</span>
          <span>© 2026 JobPilot · 你的 AI 求職教練 · 資料來源：104 人力銀行</span>
        </div>
      </footer>
    </div>
  );
}
