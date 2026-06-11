import AppShell from "@/app/_components/AppShell";

export default function SavedLoading() {
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div style={{ height: 22, width: 100, background: "#e8e6df", borderRadius: 6, marginBottom: 20 }} />
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[60, 50, 70, 55, 65, 70].map((w, i) => (
            <div key={i} style={{ height: 30, width: w, background: "#e8e6df", borderRadius: 20 }} />
          ))}
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 12, border: "0.5px solid rgba(0,0,0,0.08)", padding: "14px 18px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ height: 14, width: "50%", background: "#e8e6df", borderRadius: 4 }} />
                <div style={{ height: 20, width: 40, background: "#eeece6", borderRadius: 20 }} />
              </div>
              <div style={{ height: 13, width: "70%", background: "#eeece6", borderRadius: 4, marginBottom: 4 }} />
              <div style={{ height: 11, width: 60, background: "#f0eee8", borderRadius: 4 }} />
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <div style={{ height: 28, width: 60, background: "#e8e6df", borderRadius: 20 }} />
              <div style={{ height: 28, width: 50, background: "#e8e6df", borderRadius: 20 }} />
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
