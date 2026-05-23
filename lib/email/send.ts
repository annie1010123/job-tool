import { Resend } from "resend";
import { render } from "@react-email/render";
import { DailyDigest, type DailyDigestProps } from "./template";

export async function sendDailyDigest(to: string, props: DailyDigestProps) {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const html = await render(DailyDigest(props));

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "onboarding@resend.dev",
    to,
    subject: `JobPilot ${props.date} 今日推薦 ${props.jobs.length} 筆職缺`,
    html,
  });

  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`);
}

// Parse salary range text → monthly min (0 if 面議)
export function parseSalaryMin(salaryRange: string | null): number {
  if (!salaryRange) return 0;
  const text = salaryRange.replace(/,/g, "");
  const yearly = text.match(/年薪\s*(\d+)/);
  if (yearly) return Math.round(parseInt(yearly[1]) / 12);
  const monthly = text.match(/月薪\s*(\d+)/);
  if (monthly) return parseInt(monthly[1]);
  return 0;
}
