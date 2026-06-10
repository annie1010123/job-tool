import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { EmailConfig } from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/db/client";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const sendMagicLink: EmailConfig["sendVerificationRequest"] = async ({
  identifier,
  url,
  theme: _theme,
}) => {
  const { host } = new URL(url);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "onboarding@resend.dev",
    to: identifier,
    subject: `JobPilot 登入連結`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
        <h2 style="font-size:20px;font-weight:600;margin-bottom:16px">登入 JobPilot</h2>
        <p style="color:#555;margin-bottom:24px">
          點擊下方按鈕完成登入。連結有效時間為 24 小時，且只能使用一次。
        </p>
        <a href="${url}" style="display:inline-block;padding:12px 24px;background:#18181b;color:#fff;border-radius:8px;text-decoration:none;font-weight:500">
          登入
        </a>
        <p style="margin-top:24px;color:#999;font-size:13px">
          若您未申請登入，請忽略此郵件。<br/>
          <small>${host}</small>
        </p>
      </div>
    `,
  });
  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`);
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    {
      id: "email",
      type: "email",
      name: "Email",
      from: process.env.EMAIL_FROM ?? "onboarding@resend.dev",
      maxAge: 24 * 60 * 60,
      sendVerificationRequest: sendMagicLink,
    } satisfies EmailConfig,
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/verify-request",
  },
  session: { strategy: "database", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
