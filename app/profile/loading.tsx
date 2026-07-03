import AppShell from "@/app/_components/AppShell";

export default function ProfileLoading() {
  return (
    <AppShell>
      <div className="max-w-[1040px] mx-auto px-9 py-7">
        <div style={{ height: 22, width: 100, background: "#e8e6df", borderRadius: 6, marginBottom: 8 }} />
        <div style={{ height: 14, width: 200, background: "#eeece6", borderRadius: 4, marginBottom: 24 }} />
        {[1, 2].map((i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 12, border: "0.5px solid rgba(0,0,0,0.08)", padding: "16px 18px", marginBottom: 10 }}>
            <div style={{ height: 15, width: "45%", background: "#e8e6df", borderRadius: 4, marginBottom: 8 }} />
            <div style={{ height: 13, width: "30%", background: "#eeece6", borderRadius: 4, marginBottom: 10 }} />
            <div style={{ height: 12, width: "80%", background: "#f0eee8", borderRadius: 4 }} />
          </div>
        ))}
        <div style={{ height: 36, width: 120, background: "#e8e6df", borderRadius: 20, marginTop: 8 }} />
      </div>
    </AppShell>
  );
}
