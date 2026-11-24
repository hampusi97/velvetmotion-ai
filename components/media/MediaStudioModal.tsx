"use client";

export type GenerationStatus =
  | "idle"
  | "processing"
  | "success"
  | "error"
  | "overwrite_pending";

export { default as MediaStudioModal, default } from "@/components/MediaStudioModal";
