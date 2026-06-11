import AppShell from "@/app/_components/AppShell";

export default function BoardLoading() {
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div style={{ height: 22, width: 100, background: "#e8e6df", borderRadius: 6, marginBottom: 20 }} />
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {[80, 70, 65, 55, 60].map((w, i) => (
            <div key={i} style={{ height: 28, width: w, background: "#e8e6df", borderRadius: 20 }} />
          ))}
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 12, border: "0.5px solid rgba(0,0,0,0.08)", padding: "14px 18px", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ flex: 1 }}>
              <div style={{ height: 14, width: "55%", background: "#e8e6df", borderRadius: 4, marginBottom: 6 }} />
              <div style={{ height: 12, width: "35%", background: "#eeece6", borderRadius: 4 }} />
            </div>
            <div style={{ height: 22, width: 60, background: "#eeece6", borderRadius: 20 }} />
          </div>
        ))}
      </div>
    </AppShell>
  );
}
