// ==========================================
// 📊 PROGRESO DEL USUARIO (RLS Seguro)
// ==========================================

import { getProgress as dbGetProgress } from "../supabase.js";

let cachedProgress = null;

export async function loadProgress() {
  cachedProgress = await dbGetProgress();
  return cachedProgress;
}

export function getLocalProgress() {
  return cachedProgress;
}
