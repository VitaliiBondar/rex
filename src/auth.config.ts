import type { NextAuthConfig } from "next-auth";

// Базовий конфіг без БД/bcrypt — безпечний для edge-middleware.
// Провайдер Credentials додається у src/auth.ts (Node runtime).
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  callbacks: {
    // Захист маршрутів на рівні middleware.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;
      const isOnLogin = path.startsWith("/login");

      if (isOnLogin) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/candidates", nextUrl));
        }
        return true;
      }

      if (!isLoggedIn) return false; // → редірект на /login

      // Налаштування доступні лише адміну.
      if (path.startsWith("/settings") && auth!.user.role !== "ADMIN") {
        return Response.redirect(new URL("/candidates", nextUrl));
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  providers: [], // заповнюється в auth.ts
} satisfies NextAuthConfig;
