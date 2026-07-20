import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Об'єднує Tailwind-класи з коректним розв'язанням конфліктів.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
