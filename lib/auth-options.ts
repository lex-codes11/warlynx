import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import DiscordProvider from "next-auth/providers/discord";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // Email provider for passwordless authentication
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
    // Google OAuth provider (optional)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    // Discord OAuth provider (optional)
    ...(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET
      ? [
          DiscordProvider({
            clientId: process.env.DISCORD_CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        // Fetch complete user data from database
        const user = await prisma.user.findUnique({
          where: { id: token.sub },
          select: {
            id: true,
            email: true,
            displayName: true,
            avatar: true,
          },
        });

        if (user) {
          session.user = {
            ...session.user,
            id: user.id,
            displayName: user.displayName,
            avatar: user.avatar,
          };
        }
      }
      return session;
    },
    async jwt({ token, user, account, profile }) {
      // Initial sign in
      if (user) {
        token.sub = user.id;
      }

      // OAuth sign in - update user profile with OAuth data
      if (account && profile) {
        const displayName =
          profile.name ||
          (profile as any).username ||
          (profile as any).global_name ||
          token.email?.split("@")[0] ||
          "User";

        const avatar =
          (profile as any).image ||
          (profile as any).avatar_url ||
          (profile as any).picture ||
          null;

        // Update user with OAuth profile data
        if (token.sub) {
          await prisma.user.update({
            where: { id: token.sub },
            data: {
              displayName,
              avatar,
            },
          });
        }
      }

      return token;
    },
  },
  events: {
    async createUser({ user }) {
      // Set default displayName if not provided
      if (!user.displayName && user.email) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            displayName: user.email.split("@")[0],
          },
        });
      }
    },
  },
};
