import AppShell from "@/app/_components/AppShell";

export default function ApplicationLoading() {
  return (
    <AppShell>
      <div className="max-w-[1040px] mx-auto px-9 py-7">
        <div style={{ height: 14, width: 80, background: "#e8e6df", borderRadius: 4, marginBottom: 24 }} />
        <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid rgba(0,0,0,0.08)", padding: "20px 24px", marginBottom: 16 }}>
          <div style={{ height: 20, width: "60%", background: "#e8e6df", borderRadius: 4, marginBottom: 10 }} />
          <div style={{ height: 14, width: "40%", background: "#eeece6", borderRadius: 4, marginBottom: 8 }} />
          <div style={{ display: "flex", gap: 8 }}>
            {[50, 60, 45].map((w, i) => (
              <div key={i} style={{ height: 22, width: w, background: "#f0eee8", borderRadius: 20 }} />
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {[80, 70, 65, 75].map((w, i) => (
            <div key={i} style={{ height: 34, width: w, background: "#e8e6df", borderRadius: 8 }} />
          ))}
        </div>
        <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid rgba(0,0,0,0.08)", padding: "20px 24px" }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: 13, width: `${90 - i * 10}%`, background: "#eeece6", borderRadius: 4, marginBottom: 10 }} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
