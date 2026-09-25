import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { getEffectivePlan } from "./plans";

/** Shown by the client when the server reports the session was replaced (see the jwt callback below). */
export const SESSION_REPLACED_ERROR = "SessionReplaced";

/**
 * One signed-in browser at a time: every login stamps a fresh id on the user (and in its own JWT), so a
 * token whose id no longer matches has been superseded by a newer login. Plans that allow multiple
 * sessions (Team) are exempt. Tokens issued before this existed carry no id and are treated as valid
 * only until the user's next login.
 */
async function isSessionReplaced(userId: string, sid: string | undefined): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { activeSessionId: true } });
  if (!user) return true;
  if (!user.activeSessionId || user.activeSessionId === sid) return false;
  const plan = await getEffectivePlan(userId);
  return !plan?.allowsMultipleSessions;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { roles: true }
        });
        
        if (!user || !user.password) {
          throw new Error("Invalid email or password");
        }
        
        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error("Invalid email or password");
        }
        
        if (!user.isActive) {
          throw new Error("Account not activated. Please check your email for the magic link.");
        }
        
        const sid = randomUUID();
        await prisma.user.update({ where: { id: user.id }, data: { activeSessionId: sid } });

        return {
          id: user.id,
          sid,
          name: user.name,
          email: user.email,
          roles: user.roles.map((r: any) => r.name),
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.roles = (user as any).roles;
        token.sid = (user as any).sid;
        token.replaced = false;
      } else if (token.id) {
        token.replaced = await isSessionReplaced(token.id as string, token.sid as string | undefined);
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.replaced) {
        // Deliberately no id/roles: every server check treats this browser as signed out, and the client signs out on the error.
        (session as any).error = SESSION_REPLACED_ERROR;
      } else if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).roles = token.roles;
      }
      return session;
    }
  }
};
