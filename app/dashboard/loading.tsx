import AppShell from "@/app/_components/AppShell";

export default function DashboardLoading() {
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div style={{ marginBottom: 24 }}>
          <div style={{ height: 24, width: 80, background: "#e8e6df", borderRadius: 6, marginBottom: 8 }} />
          <div style={{ height: 16, width: 180, background: "#e8e6df", borderRadius: 4 }} />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 12, border: "0.5px solid rgba(0,0,0,0.08)", padding: "16px 18px", marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ height: 16, width: "60%", background: "#e8e6df", borderRadius: 4, marginBottom: 8 }} />
                <div style={{ height: 13, width: "40%", background: "#eeece6", borderRadius: 4, marginBottom: 8 }} />
                <div style={{ display: "flex", gap: 6 }}>
                  <div style={{ height: 20, width: 50, background: "#eeece6", borderRadius: 20 }} />
                  <div style={{ height: 20, width: 60, background: "#eeece6", borderRadius: 20 }} />
                </div>
              </div>
              <div style={{ height: 30, width: 60, background: "#e8e6df", borderRadius: 20 }} />
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
