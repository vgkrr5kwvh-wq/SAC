import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isCurrentAdminSession } from "@/lib/admin-authorization";

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Hostinger terminates HTTPS at a trusted reverse proxy. AUTH_URL supplies
  // the canonical public origin instead of the proxy's 0.0.0.0:3000 origin.
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsedCredentials = credentialsSchema.safeParse(credentials);
        if (!parsedCredentials.success) return null;

        const email = parsedCredentials.data.email.toLowerCase();
        const adminUser = await prisma.adminUser.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            passwordHash: true,
            isActive: true,
            role: true,
            sessionVersion: true,
          },
        });

        if (!adminUser?.isActive) return null;

        const passwordMatches = await compare(
          parsedCredentials.data.password,
          adminUser.passwordHash,
        );
        if (!passwordMatches) return null;

        return {
          id: adminUser.id,
          name: adminUser.name ?? "Administrator",
          email: adminUser.email,
          role: adminUser.role,
          sessionVersion: adminUser.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.sessionVersion = user.sessionVersion;
        return token;
      }
      if (!token.sub) return null;
      const administrator = await prisma.adminUser.findUnique({ where: { id: token.sub }, select: { isActive: true, role: true, sessionVersion: true } });
      if (!administrator || !isCurrentAdminSession(administrator, token.sessionVersion)) return null;
      token.role = administrator.role;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub && token.role && typeof token.sessionVersion === "number") {
        session.user.id = token.sub;
        session.user.role = token.role;
        session.user.sessionVersion = token.sessionVersion;
      }
      return session;
    },
  },
});
