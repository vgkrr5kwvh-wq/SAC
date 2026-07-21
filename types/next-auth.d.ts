import type { DefaultSession } from "next-auth";
import type { AdminRole } from "@prisma/client";

declare module "@auth/core/jwt" {
  interface JWT {
    role?: AdminRole;
    sessionVersion?: number;
  }
}

declare module "next-auth" {
  interface User {
    role: AdminRole;
    sessionVersion: number;
  }

  interface Session {
    user: {
      id: string;
      role: AdminRole;
      sessionVersion: number;
    } & DefaultSession["user"];
  }
}

export {};
