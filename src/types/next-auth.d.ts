import type { DefaultSession } from "next-auth";

type AppRole = "USER" | "ADMIN" | "SUPER_ADMIN";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
      blocked: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: AppRole;
    blocked?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    blockedCheckedAt?: number;
    id?: string;
    role?: AppRole;
    blocked?: boolean;
  }
}
