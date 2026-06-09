import CoverLetterTryIt from "./_components/CoverLetterTryIt";

export default async function Home() {

  const features = [
    { icon: "🎯", title: "AI 語意推薦", desc: "不是關鍵字匹配，是理解你的履歷和求職意圖，每天推薦最 match 的職缺" },
    { icon: "✉️", title: "一鍵推薦信", desc: "根據你的履歷和 JD 自動生成客製化推薦信，3 種語氣任選" },
    { icon: "🧠", title: "面試 AI 進化", desc: "每次面試後 AI 復盤，題庫自動進化，下次準備更精準" },
    { icon: "📋", title: "全流程追蹤", desc: "從收藏到投遞到面試，Kanban 看板統一管理所有進度" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#f1efe8" }}>
      {/* Nav */}
      <header style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 600, fontSize: 16, color: "#1a1a18", letterSpacing: "-0.02em" }}>JobPilot</span>
        <a href="/login" style={{ fontSize: 13, color: "#888780", textDecoration: "none" }}>登入</a>
      </header>

      {/* Hero */}
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 16px 60px", textAlign: "center" }}>
        <h1 style={{ fontSize: 32, fontWeight: 600, color: "#1a1a18", lineHeight: 1.3, letterSpacing: "-0.02em", marginBottom: 12 }}>
          你的 AI 求職教練
          <br />
          每一次面試都讓你更強
        </h1>
        <p style={{ fontSize: 16, color: "#5f5e5a", lineHeight: 1.7, marginBottom: 32, maxWidth: 480, margin: "0 auto 32px" }}>
          從語意推薦、推薦信生成，到面試 AI 復盤——JobPilot 記得你的每一次經驗，讓求職從體力活變成策略活。
        </p>

        <a href="/login" style={{ display: "inline-block", padding: "12px 32px", borderRadius: 10, background: "#1a1a18", color: "#fff", fontSize: 14, fontWeight: 500, textDecoration: "none", marginBottom: 48 }}>
          免費開始使用
        </a>

        {/* Feature cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 48, textAlign: "left" }}>
          {features.map((f) => (
            <div key={f.title} style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.1)", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 20, marginBottom: 8 }}>{f.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a18", marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: "#888780", lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Try it section */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1a1a18", marginBottom: 4 }}>30 秒體驗</h2>
          <p style={{ fontSize: 13, color: "#888780", marginBottom: 20 }}>貼上任何職缺描述，AI 立即幫你生成推薦信</p>
          <CoverLetterTryIt />
        </div>
      </main>

      <footer style={{ textAlign: "center", fontSize: 12, color: "#c8c7c2", padding: "32px 16px" }}>
        © 2026 JobPilot · AI 求職教練
      </footer>
    </div>
  );
}
