"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

// Повертає текст помилки або кидає редірект-помилку Next при успіху.
export async function loginAction(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/candidates",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Невірний email або пароль";
    }
    throw error; // NEXT_REDIRECT при успіху — прокидаємо далі
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
