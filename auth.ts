import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/lib/auth/config";
import { credentialsSchema } from "@/lib/auth/schemas";
import { isAppRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { roles, users } from "@/lib/db/schema";

const DUMMY_PASSWORD_HASH =
  "$2b$12$NPaJX6seI5SjocialgTGReSOcyDEw4izzFJpStu0USpRuGNdcFRmq";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsedCredentials = credentialsSchema.safeParse(credentials);
        if (!parsedCredentials.success) {
          return null;
        }

        const [user] = await db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            passwordHash: users.passwordHash,
            role: roles.slug,
          })
          .from(users)
          .innerJoin(roles, eq(users.roleId, roles.id))
          .where(eq(users.email, parsedCredentials.data.email))
          .limit(1);

        const passwordMatches = await compare(
          parsedCredentials.data.password,
          user?.passwordHash ?? DUMMY_PASSWORD_HASH,
        );

        if (
          !user ||
          !user.passwordHash ||
          !passwordMatches ||
          !isAppRole(user.role)
        ) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub && isAppRole(token.role)) {
        session.user.id = token.sub;
        session.user.role = token.role;
      }

      return session;
    },
  },
});
