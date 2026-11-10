import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const containerClass = "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8";
