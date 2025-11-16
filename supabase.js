// ==========================================
// 🔌 Supabase Wrapper (seguro con RLS)
// ==========================================

let supabaseClient = null;

export function initSupabase() {
  supabaseClient = supabase.createClient(
    "https://yuiwlbrfihyqoycsrhrc.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1aXdsYnJmaWh5cW95Y3NyaHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMjkxODUsImV4cCI6MjA3ODcwNTE4NX0.3bb8_qc1VVTV8cZNP3irUOAUDsArWHV-QlObvPtI8cM"
  );
}

export async function login(email, password) {
  return await supabaseClient.auth.signInWithPassword({ email, password });
}

export async function register(email, password) {
  return await supabaseClient.auth.signUp({ email, password });
}

export async function logout() {
  return await supabaseClient.auth.signOut();
}

export async function getCurrentUser() {
  const { data } = await supabaseClient.auth.getUser();
  return data.user;
}

export async function getProgress() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data } = await supabaseClient
    .from("user_progress")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return data;
}

export async function saveProgress(maxLevel, totalScore) {
  const user = await getCurrentUser();
  if (!user) return;

  await supabaseClient
    .from("user_progress")
    .update({
      max_level: maxLevel,
      total_score: totalScore,
      updated_at: new Date()
    })
    .eq("user_id", user.id);
}
