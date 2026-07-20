import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge-безпечний middleware: використовує лише authConfig (без Prisma/bcrypt).
// Логіка захисту маршрутів — у callbacks.authorized.
export default NextAuth(authConfig).auth;

export const config = {
  // Захищаємо все, крім статики, зображень і API авторизації.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
