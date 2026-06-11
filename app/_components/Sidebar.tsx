"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  {
    href: "/dashboard",
    label: "主頁",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/saved",
    label: "收藏區",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    href: "/board",
    label: "求職追蹤",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="3" y="3" width="5" height="18" rx="1.5" />
        <rect x="10" y="7" width="5" height="14" rx="1.5" />
        <rect x="17" y="5" width="5" height="16" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "個人資料",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <aside style={{
      width: 220,
      flexShrink: 0,
      background: "#ebe9e2",
      borderRight: "0.5px solid rgba(0,0,0,0.08)",
      display: "flex",
      flexDirection: "column",
      minHeight: "100vh",
      position: "sticky",
      top: 0,
      height: "100vh",
    }}>
      {/* Logo */}
      <div style={{ padding: "24px 20px 20px" }}>
        <Link href="/dashboard" style={{ textDecoration: "none" }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#1a1a18", letterSpacing: "-0.02em" }}>
            JobPilot
          </span>
        </Link>
        <p style={{ fontSize: 11, color: "#aaa8a0", marginTop: 2 }}>AI 求職教練</p>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "4px 10px" }}>
        {NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                borderRadius: 10,
                marginBottom: 2,
                textDecoration: "none",
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? "#1a1a18" : "#888780",
                background: active ? "rgba(0,0,0,0.07)" : "transparent",
                transition: "all 0.15s",
              }}
            >
              <span style={{ opacity: active ? 1 : 0.6 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: intent shortcut */}
      <div style={{ padding: "12px 10px 20px" }}>
        <Link
          href="/onboarding/intent"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "9px 12px",
            borderRadius: 10,
            textDecoration: "none",
            fontSize: 12,
            color: "#aaa8a0",
            transition: "color 0.15s",
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
          求職意圖設定
        </Link>
      </div>
    </aside>
  );
}
