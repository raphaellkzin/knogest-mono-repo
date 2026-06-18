import "server-only";

import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

import { login } from "@/generated/clients/login";

import type { NextAuthOptions } from "next-auth";

const credentialsSchema = z.object({
  username: z.string().trim().min(1).max(255),
  password: z.string().min(1).max(255),
});

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: "/auth/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 4,
  },
  providers: [
    CredentialsProvider({
      name: "Credenciais",
      credentials: {
        username: { label: "Usuário", type: "text" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        try {
          const response = await login({ data: parsed.data });

          if (!response.success) {
            return null;
          }

          return {
            id: response.data.userId,
            apiAccessToken: response.data.token,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const apiAccessToken =
          "apiAccessToken" in user && typeof user.apiAccessToken === "string"
            ? user.apiAccessToken
            : undefined;

        token.userId = user.id;

        if (apiAccessToken) {
          token.apiAccessToken = apiAccessToken;
        }
      }

      return token;
    },
    async session({ session, token }) {
      const userId = typeof token.userId === "string" ? token.userId : undefined;

      if (session.user && userId) {
        session.user.id = userId;
      }

      return session;
    },
  },
};
