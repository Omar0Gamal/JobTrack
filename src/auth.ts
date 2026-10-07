import NextAuth from "next-auth";
import type { DefaultSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/server/db/prisma";
import { authConfig } from "./auth.config";
import { getAppMode, getAllowedEmails } from "@/lib/env";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      if (getAppMode() !== "personal") {
        return false;
      }
      const email = user.email?.trim().toLowerCase();
      if (!email) {
        return false;
      }
      const allowedEmails = getAllowedEmails();
      if (allowedEmails.length === 0 || !allowedEmails.includes(email)) {
        return false;
      }
      return true;
    },
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});
