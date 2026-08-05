import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isDesktop(): boolean {
  return typeof window !== "undefined" && !!window.electronAPI?.e2ee;
}
