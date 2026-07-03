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
  "求職素材散落各處——履歷在雲端、自介在備忘錄、面試題目在 Notion，面試前夕拼不起來",
  "同時投十幾間，記不住投到哪、誰回了、該追誰，全靠腦袋和試算表硬撐",
  "每場面試的經驗都用過即丟，下一場又從零開始準備",
];

const FEATURES = [
  {
    tag: "找職缺",
    title: "每天 AI 挑好職缺",
    desc: "AI 語意比對你的履歷與求職意圖，每天從 104 篩出真的適合的職缺，附相符度與推薦理由。",
  },
  {
    tag: "管進度",
    title: "投遞看板一眼掌握",
    desc: "投遞中、面試中、錄取一個看板管好，久沒回音自動提醒你該追蹤，不再漏掉任何一間。",
  },
  {
    tag: "寫文件",
    title: "推薦信一鍵生成",
    desc: "根據你的履歷與職缺描述客製生成，三種語氣可選，投遞前後都能隨時調整。",
  },
  {
    tag: "練面試",
    title: "一場面試一間作戰室",
    desc: "核心題、行為題、技術題、該職類考古題自動分區備齊，AI 教練陪你逐題打磨答案。",
  },
  {
    tag: "存經歷",
    title: "經歷庫隨時取用",
    desc: "上傳履歷自動拆成一條條經歷素材，寫推薦信、答面試題時 AI 直接引用你的真實故事。",
  },
  {
    tag: "會進化",
    title: "復盤讓題庫越變越聰明",
    desc: "面試後錄音或手動復盤，被問過的題目自動回流題庫，下一場準備直接站在上一場的肩膀上。",
  },
];

const STEPS = [
  {
    no: "01",
    tag: "整合",
    title: "把散落的求職素材搬進來",
    desc: "上傳履歷、設定意圖，經歷庫與核心題庫自動成形——之後每一步 AI 都用得上這些素材。",
  },
  {
    no: "02",
    tag: "行動",
    title: "投遞與面試都在同一個地方",
    desc: "AI 推薦職缺、一鍵推薦信、看板追進度；面試前打開該職缺的作戰室，題目已經按區備好。",
  },
  {
    no: "03",
    tag: "累積",
    title: "每場面試都讓你變強",
    desc: "復盤把實戰題目寫回題庫、磨過的答案跟著你到下一場——用越久，準備越快、命中越高。",
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
            學生、新鮮人到轉職者都適用
          </span>
          <h1 className="mt-5 text-[2.4rem] font-bold leading-[1.15] tracking-tight sm:text-[3.1rem]">
            求職的一切，
            <br className="hidden sm:block" />
            <span className="text-[#0f6e56]">整合在同一個地方。</span>
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-[#5f5e5a] sm:text-base">
            職缺、投遞進度、推薦信、面試題庫、復盤心得——不再散落在十個分頁和三本筆記裡。
            JobPilot 把整段求職整合成一條流水線，而且每面一場，AI 就更懂怎麼幫你準備下一場。
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

        {/* 產品 mockup：面試作戰室 */}
        <div className="relative">
          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.25)]">
            <div className="flex items-center justify-between text-xs text-[#888780]">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-[#0f6e56]" /> 面試作戰室 · 產品經理實習生
              </span>
              <span>後天面試</span>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="flex items-center gap-2 text-[12px] font-semibold text-[#1a1a18]">
                  核心題目 <span className="font-normal text-[#888780]">6 題</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between rounded-xl border border-black/8 bg-[#faf9f6] px-3.5 py-2.5">
                  <span className="text-[13px] text-[#3d3d3a]">請做一個簡短的自我介紹。</span>
                  <span className="rounded-lg bg-[#E1F5EE] px-2.5 py-1 text-[11px] font-semibold text-[#0f6e56]">已練 2 版</span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-[12px] font-semibold text-[#1a1a18]">
                  行為題 <span className="font-normal text-[#888780]">7 題</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between rounded-xl border border-black/8 bg-[#faf9f6] px-3.5 py-2.5">
                  <span className="text-[13px] text-[#3d3d3a]">分享一次你解決使用者問題的經驗。</span>
                  <span className="rounded-lg bg-[#f0efe9] px-2.5 py-1 text-[11px] text-[#888780]">練習</span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-[12px] font-semibold text-[#1a1a18]">
                  歷史題 · PM 常被問 <span className="font-normal text-[#888780]">4 題</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between rounded-xl border border-[#5DCAA5]/40 bg-[#E1F5EE]/50 px-3.5 py-2.5">
                  <span className="text-[13px] text-[#3d3d3a]">如何用數據說服工程團隊調整優先序？</span>
                  <span className="text-[11px] text-[#0f6e56]">上次被問過</span>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-[#faf9f6] p-3 text-[12.5px] leading-6 text-[#5f5e5a]">
              <span className="font-semibold text-[#1a1a18]">AI 教練 ·</span>{" "}
              答案已經有具體情境了，建議補一個量化結果——上次專案的 450+ 份問卷就很適合放在這。
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
          你不缺努力，
          <br />
          缺的是把努力收在同一個地方。
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

      {/* ── 六大整合功能 ── */}
      <section className="bg-[#faf9f6] py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 text-center sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#888780]">一站整合</p>
          <h2 className="mx-auto mt-3 max-w-4xl whitespace-nowrap text-[1.35rem] font-bold leading-snug tracking-tight sm:text-[2.4rem]">
            從找職缺到拿 Offer，六件事一個工具搞定
          </h2>
        </div>
        <div className="mx-auto mt-12 grid max-w-6xl gap-5 px-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-black/8 bg-white p-7">
              <span className="rounded-full bg-[#E1F5EE] px-2.5 py-1 text-xs font-semibold text-[#0f6e56]">{f.tag}</span>
              <h3 className="mt-4 text-[17px] font-semibold leading-snug">{f.title}</h3>
              <p className="mt-2.5 text-[14px] leading-7 text-[#5f5e5a]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 三步驟（整合 → 行動 → 累積）── */}
      <section id="how" className="scroll-mt-8 py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 text-center sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#888780]">JobPilot 怎麼運作</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-[1.9rem] font-bold leading-snug tracking-tight sm:text-[2.4rem]">
            不只是整理工具，
            <br className="sm:hidden" />
            是會累積的求職系統
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-[#5f5e5a]">
            素材整合進來、行動在同一處完成、經驗自動累積——這個循環讓你每一場都比上一場強。
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
      <section className="mx-auto max-w-6xl px-5 pb-16 sm:px-8 lg:pb-24">
        <div className="rounded-[28px] bg-[#dff0e6] px-6 py-14 text-center sm:px-8 sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#0f6e56]/15 bg-white px-3.5 py-1.5 text-xs font-medium text-[#0f6e56]">
            每一次面試，都讓你更強
          </span>
          <h2 className="mx-auto mt-6 max-w-2xl text-[2rem] font-bold leading-tight tracking-tight text-[#16261f] sm:text-[2.8rem]">
            別再讓求職的努力四散各處。
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-7 text-[#3d4a44] sm:text-base">
            職缺、進度、推薦信、題庫、復盤，通通收進 JobPilot——把省下來的時間拿去做真正重要的事：準備面試，拿下 Offer。
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
