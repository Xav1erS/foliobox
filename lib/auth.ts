import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Nodemailer from "next-auth/providers/nodemailer";
import { db } from "@/lib/db";
import {
  getConfiguredAppOrigin,
  normalizeAuthRedirectUrl,
} from "@/lib/app-url";
import { sendMagicLinkEmail } from "@/lib/auth-email";

const configuredAppOrigin = getConfiguredAppOrigin();

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  trustHost: true,
  providers: [
    Nodemailer({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: `集盒 FolioBox <${process.env.EMAIL_FROM ?? "noreply@foliobox.art"}>`,
      async sendVerificationRequest(params) {
        await sendMagicLinkEmail(params);
      },
    }),
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/login/verify",
    error: "/login",
  },
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60,  // 30 天
    updateAge: 24 * 60 * 60,    // 每 24h 刷新 expires，避免频繁写 DB
  },
  callbacks: {
    redirect({ url, baseUrl }) {
      return normalizeAuthRedirectUrl(url, configuredAppOrigin || baseUrl);
    },
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
