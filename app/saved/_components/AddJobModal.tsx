"use client";

import { useState } from "react";

interface SavedJob {
  id: string;
  userId: string;
  jdId: string | null;
  externalUrl: string;
  companyName: string;
  title: string;
  platform: string;
  companyType: string | null;
  status: string;
  savedAt: string;
}

const PLATFORM_OPTIONS = [
  { value: "104", label: "104" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "cake", label: "Cake" },
  { value: "yourator", label: "Yourator" },
  { value: "other", label: "其他" },
];

const COMPANY_TYPE_OPTIONS = [
  { value: "startup", label: "新創" },
  { value: "large", label: "大公司" },
  { value: "traditional", label: "傳產" },
  { value: "", label: "不選" },
];

export default function AddJobModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (job: SavedJob) => void;
}) {
  const [parseUrl, setParseUrl] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [parsed, setParsed] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [platform, setPlatform] = useState("other");
  const [companyType, setCompanyType] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function parseFromUrl() {
    const url = parseUrl.trim();
    if (!url) return;
    setParsing(true);
    setParseError("");
    try {
      const resp = await fetch("/api/parse-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await resp.json();
      if (!resp.ok || data.error) {
        setParseError("無法解析此網頁，請手動填寫（部分網站需要登入）");
        return;
      }
      const { companyName: c, jobTitle: j } = data.parsed ?? {};
      if (c) setCompanyName(c);
      if (j) setJobTitle(j);
      // Auto-detect platform from URL
      if (url.includes("104.com")) setPlatform("104");
      else if (url.includes("linkedin.com")) setPlatform("linkedin");
      else if (url.includes("cake")) setPlatform("cake");
      else if (url.includes("yourator.co")) setPlatform("yourator");
      setParsed(true);
    } finally {
      setParsing(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim() || !jobTitle.trim()) {
      setError("公司名稱和職缺名稱為必填");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const resp = await fetch("/api/saved-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalUrl: parseUrl.trim() || undefined,
          companyName: companyName.trim(),
          title: jobTitle.trim(),
          platform,
          companyType: companyType || null,
        }),
      });
      if (!resp.ok) {
        const d = await resp.json().catch(() => ({}));
        setError(d.error ?? "儲存失敗，請再試一次");
        return;
      }
      const data = await resp.json();
      onAdded(data.job);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: 8,
    border: "0.5px solid rgba(0,0,0,0.2)",
    padding: "9px 12px",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
    color: "#1a1a18",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: "#888780",
    display: "block",
    marginBottom: 5,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.3)",
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 24,
          width: "100%",
          maxWidth: 480,
          boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
        }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "#1a1a18", marginBottom: 20 }}>新增職缺</h2>

        {/* URL parse */}
        <div
          style={{
            marginBottom: 20,
            padding: 14,
            background: "#f7f6f3",
            borderRadius: 10,
            border: "0.5px solid rgba(0,0,0,0.08)",
          }}
        >
          <label style={labelStyle}>貼上職缺網址（自動解析）</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={parseUrl}
              onChange={(e) => { setParseUrl(e.target.value); setParsed(false); setParseError(""); }}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), parseFromUrl())}
              placeholder="https://www.104.com.tw/job/..."
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              type="button"
              onClick={parseFromUrl}
              disabled={parsing || !parseUrl.trim()}
              style={{
                flexShrink: 0,
                borderRadius: 8,
                background: "#1a1a18",
                color: "#fff",
                border: "none",
                padding: "9px 14px",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                opacity: (parsing || !parseUrl.trim()) ? 0.4 : 1,
              }}
            >
              {parsing ? "解析中…" : "解析"}
            </button>
          </div>
          {parseError && <p style={{ fontSize: 12, color: "#c0542a", marginTop: 6 }}>{parseError}</p>}
          {parsed && <p style={{ fontSize: 12, color: "#2E7D32", marginTop: 6 }}>解析成功，請確認下方資料</p>}
        </div>

        <form onSubmit={handleSave}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>公司名稱 *</label>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Google"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>職缺名稱 *</label>
              <input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. 產品經理實習生"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>平台</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                style={{ ...inputStyle }}
              >
                {PLATFORM_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ ...labelStyle, marginBottom: 8 }}>公司類型（選填）</label>
              <div style={{ display: "flex", gap: 8 }}>
                {COMPANY_TYPE_OPTIONS.map((ct) => (
                  <button
                    key={ct.value}
                    type="button"
                    onClick={() => setCompanyType(companyType === ct.value ? "" : ct.value)}
                    style={{
                      flex: 1,
                      padding: "7px 0",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 500,
                      border: "0.5px solid rgba(0,0,0,0.15)",
                      cursor: "pointer",
                      background: companyType === ct.value ? "#1a1a18" : "#fff",
                      color: companyType === ct.value ? "#fff" : "#888780",
                    }}
                  >
                    {ct.label}
                  </button>
                ))}
              </div>
            </div>

            {error && <p style={{ fontSize: 12, color: "#c0542a" }}>{error}</p>}

            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 10,
                  border: "0.5px solid rgba(0,0,0,0.15)",
                  background: "#fff",
                  color: "#888780",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                取消
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 10,
                  border: "none",
                  background: "#1a1a18",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  opacity: saving ? 0.5 : 1,
                }}
              >
                {saving ? "儲存中…" : "儲存"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
