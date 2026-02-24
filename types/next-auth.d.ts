import { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string;
      displayName: string;
      avatar: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email: string;
    displayName: string;
    avatar: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub: string;
  }
}
