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
  const { data, error } = await supabaseClient.auth.signUp({ email, password });

  if (error) return { error };

  if (data.user) {
    await createInitialProgress(data.user.id);  // 🔥 CREA PROGRESO AUTOMÁTICO
  }

  return { error: null };
}


export async function createInitialProgress(user_id) {
  await supabaseClient
    .from("user_progress")
    .insert({
      user_id,
      max_level: 1,
      total_score: 0
    });
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
export async function upsertRanking(score) {
  const user = await getCurrentUser();
  if (!user) return;

  return await supabaseClient
    .from("ranking")
    .upsert(
      {
        user_id: user.id,
        username: user.email,
        score,
        updated_at: new Date()
      },
      { onConflict: "user_id" }      // ← ESTO ES CLAVE
    );

    
}


export async function getRanking() {
  const { data } = await supabaseClient
    .from("ranking")
    .select("*")
    .order("score", { ascending: false })
    .limit(20);

  return data;
}

export async function ensureProgressRow() {
  const user = await getCurrentUser();
  if (!user) return;

  const { data } = await supabaseClient
    .from("user_progress")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // Si NO existe → crearla
  if (!data) {
    await supabaseClient
      .from("user_progress")
      .insert({
        user_id: user.id,
        max_level: 1,
        total_score: 0,
        updated_at: new Date()
      });
  }
}
