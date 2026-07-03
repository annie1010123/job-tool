import AppShell from "@/app/_components/AppShell";

export default function InterviewLoading() {
  return (
    <AppShell>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "28px 36px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ height: 24, width: 120, background: "#e8e6df", borderRadius: 6, marginBottom: 8 }} />
          <div style={{ height: 16, width: 300, background: "#e8e6df", borderRadius: 4 }} />
        </div>
        <div style={{ height: 8, background: "#eeece6", borderRadius: 4, marginBottom: 28 }} />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 12, border: "0.5px solid rgba(0,0,0,0.08)", padding: "16px 18px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ height: 16, width: "50%", background: "#e8e6df", borderRadius: 4 }} />
            <div style={{ height: 28, width: 64, background: "#eeece6", borderRadius: 8 }} />
          </div>
        ))}
      </div>
    </AppShell>
  );
}
