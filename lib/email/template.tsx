import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface JobRow {
  title: string;
  companyName: string;
  industry: string | null;
  salaryMin: number;
  salaryRange: string | null;
  location: string | null;
  externalUrl: string;
  recruitmentActivity: string | null;
  replyDays: string | null;
  contactTime: string | null;
  score: number;
  postedAt: string | null;
  reasoning: string | null;
  alignedSkills: string[];
  trackingUrl?: string;
}

export interface DailyDigestProps {
  date: string;
  totalFetched: number;
  newToday: number;
  mianyiCount: number;
  updatedCount: number;   // 更新日期/薪資變動
  salaryChangedCount: number;
  unchangedCount: number; // 仍在架無變動
  delistedCount: number;  // 已下架
  jobs: JobRow[];
}

function activityInfo(activity: string | null): { emoji: string; label: string; score: string } {
  if (!activity) return { emoji: "⚪", label: "—", score: "" };
  if (activity.includes("活躍")) return { emoji: "🟢", label: "活躍", score: " (1.0)" };
  if (activity.includes("普通")) return { emoji: "🟡", label: "普通", score: " (0.79)" };
  return { emoji: "🔴", label: activity, score: " (0.33)" };
}

const td: React.CSSProperties = {
  padding: "9px 10px",
  fontSize: "12px",
  color: "#374151",
  borderBottom: "1px solid #f3f4f6",
  verticalAlign: "top",
};

const th: React.CSSProperties = {
  padding: "7px 10px",
  fontSize: "11px",
  fontWeight: 600,
  color: "#6b7280",
  backgroundColor: "#f9fafb",
  borderBottom: "2px solid #e5e7eb",
  whiteSpace: "nowrap" as const,
  textAlign: "left" as const,
};

export function DailyDigest({
  date,
  totalFetched,
  newToday,
  mianyiCount,
  updatedCount,
  salaryChangedCount,
  unchangedCount,
  delistedCount,
  jobs,
}: DailyDigestProps) {
  return (
    <Html lang="zh-TW">
      <Head />
      <Preview>{`JobPilot ${date} 今日推薦 ${jobs.length} 筆職缺`}</Preview>
      <Body style={{ backgroundColor: "#f9fafb", fontFamily: "system-ui, sans-serif", margin: 0, padding: "24px 0" }}>
        <Container style={{ maxWidth: "860px", margin: "0 auto", backgroundColor: "#ffffff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>

          {/* Header */}
          <Section style={{ backgroundColor: "#18181b", padding: "20px 28px" }}>
            <Text style={{ color: "#ffffff", fontSize: "18px", fontWeight: 700, margin: 0 }}>JobPilot</Text>
            <Text style={{ color: "#a1a1aa", fontSize: "13px", margin: "4px 0 0" }}>每日職缺推薦 · {date}</Text>
          </Section>

          {/* Summary */}
          <Section style={{ padding: "20px 28px", borderBottom: "1px solid #e5e7eb" }}>
            <Text style={{ fontSize: "15px", fontWeight: 700, color: "#111827", margin: "0 0 12px" }}>📊 摘要</Text>
            <table style={{ borderCollapse: "collapse" }}>
              <tbody>
                {[
                  ["今日總抓取", `${totalFetched.toLocaleString()} 筆`],
                  ["🆕 今日新上架", `${newToday.toLocaleString()} 筆（含面議 ${mianyiCount} 筆）`],
                  ["🔄 更新日期變動", `${updatedCount} 筆`],
                  ["💰 薪資變動", `${salaryChangedCount} 筆`],
                  ["📌 仍在架（無變動）", `${unchangedCount} 筆`],
                  ["💀 已下架", `${delistedCount} 筆`],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td style={{ padding: "3px 20px 3px 0", fontSize: "13px", color: "#6b7280", whiteSpace: "nowrap" }}>{label}</td>
                    <td style={{ padding: "3px 0", fontSize: "13px", color: "#111827", fontWeight: 500 }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          {/* Jobs Table */}
          <Section style={{ padding: "20px 28px" }}>
            <Text style={{ fontSize: "15px", fontWeight: 700, color: "#111827", margin: "0 0 14px" }}>
              🆕 今日推薦職缺（{jobs.length} 筆）
            </Text>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "700px" }}>
                <thead>
                  <tr>
                    <th style={th}>月薪下限</th>
                    <th style={th}>公司</th>
                    <th style={th}>產業</th>
                    <th style={th}>職位</th>
                    <th style={th}>地區</th>
                    <th style={th}>連結</th>
                    <th style={th}>徵才積極度</th>
                    <th style={th}>回覆求職者</th>
                    <th style={th}>聯絡應徵者</th>
                    <th style={th}>相符分數</th>
                    <th style={th}>更新日期</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job, i) => {
                    const act = activityInfo(job.recruitmentActivity);
                    return (
                      <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#fafafa" }}>
                        <td style={{ ...td, fontWeight: 600, color: job.salaryMin > 0 ? "#111827" : "#9ca3af", whiteSpace: "nowrap" }}>
                          {job.salaryMin > 0 ? `${job.salaryMin.toLocaleString()}+` : "面議"}
                        </td>
                        <td style={{ ...td }}>{job.companyName}</td>
                        <td style={{ ...td, color: "#6b7280" }}>{job.industry ?? "—"}</td>
                        <td style={{ ...td, maxWidth: "240px" }}>
                          <Link href={job.trackingUrl ?? job.externalUrl} style={{ color: "#2563eb", textDecoration: "none", fontWeight: 500 }}>
                            {job.title}
                          </Link>
                          {job.reasoning && (
                            <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "3px" }}>{job.reasoning}</div>
                          )}
                          {job.alignedSkills.length > 0 && (
                            <div style={{ marginTop: "4px" }}>
                              {job.alignedSkills.map((s) => (
                                <span key={s} style={{ display: "inline-block", fontSize: "10px", backgroundColor: "#eff6ff", color: "#2563eb", borderRadius: "4px", padding: "1px 5px", marginRight: "3px" }}>{s}</span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td style={{ ...td, whiteSpace: "nowrap" }}>{job.location ?? "—"}</td>
                        <td style={{ ...td, whiteSpace: "nowrap" }}>
                          <Link href={job.trackingUrl ?? job.externalUrl} style={{ color: "#6b7280", fontSize: "11px", textDecoration: "underline" }}>104</Link>
                        </td>
                        <td style={{ ...td, whiteSpace: "nowrap" }}>
                          {act.emoji} {act.label}{act.score}
                        </td>
                        <td style={{ ...td, color: "#6b7280", whiteSpace: "nowrap" }}>{job.replyDays ?? "—"}</td>
                        <td style={{ ...td, color: "#6b7280", whiteSpace: "nowrap" }}>{job.contactTime ?? "—"}</td>
                        <td style={{ ...td, whiteSpace: "nowrap", fontWeight: 600, color: "#2563eb" }}>{job.score.toFixed(3)}</td>
                        <td style={{ ...td, whiteSpace: "nowrap", color: "#9ca3af" }}>
                          {job.postedAt ? `${job.postedAt} 更新` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>

          {/* Footer */}
          <Section style={{ padding: "14px 28px", backgroundColor: "#f9fafb", borderTop: "1px solid #e5e7eb" }}>
            <Text style={{ fontSize: "12px", color: "#9ca3af", margin: 0, textAlign: "center" }}>
              JobPilot · 每天早上 8:00 自動推薦 · 資料來源：104人力銀行
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}
