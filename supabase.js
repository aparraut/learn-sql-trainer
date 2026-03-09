// ==========================================
// Supabase wrapper
// ==========================================

let supabaseClient = null;

export function initSupabase() {
  try {
    const { supabaseUrl, supabaseAnonKey } = getRuntimeConfig();
    supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    throw new Error(`No se pudo inicializar Supabase: ${toMessage(error)}`);
  }
}

export async function login(email, password) {
  try {
    ensureClient();
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    return { error: error ?? null };
  } catch (error) {
    return { error: { message: `No se pudo iniciar sesion: ${toMessage(error)}` } };
  }
}

export async function register(email, password) {
  try {
    ensureClient();
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) return { error };

    if (data.user) {
      await createInitialProgress(data.user.id);
    }

    return { error: null };
  } catch (error) {
    return { error: { message: `No se pudo registrar: ${toMessage(error)}` } };
  }
}

export async function createInitialProgress(user_id) {
  ensureClient();
  const { error } = await supabaseClient.from("user_progress").insert({
    user_id,
    max_level: 1,
    total_score: 0,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`No se pudo crear progreso inicial: ${error.message}`);
  }
}

export async function logout() {
  try {
    ensureClient();
    const { error } = await supabaseClient.auth.signOut();
    return { error: error ?? null };
  } catch (error) {
    return { error: { message: `No se pudo cerrar sesion: ${toMessage(error)}` } };
  }
}

export async function getCurrentUser() {
  ensureClient();
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) throw new Error(`No se pudo obtener usuario actual: ${error.message}`);
  return data.user;
}

export async function getProgress() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabaseClient
    .from("user_progress")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo leer progreso: ${error.message}`);
  }

  return data;
}

export async function saveProgress(maxLevel, totalScore) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No hay usuario autenticado.");

  const { error } = await supabaseClient
    .from("user_progress")
    .update({
      max_level: maxLevel,
      total_score: totalScore,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) {
    throw new Error(`No se pudo guardar progreso: ${error.message}`);
  }
}

export async function upsertRanking(score) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No hay usuario autenticado.");

  const { error } = await supabaseClient.from("ranking").upsert(
    {
      user_id: user.id,
      username: user.email,
      score,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    throw new Error(`No se pudo actualizar ranking: ${error.message}`);
  }
}

export async function getRanking() {
  ensureClient();
  const { data, error } = await supabaseClient
    .from("ranking")
    .select("*")
    .order("score", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(`No se pudo cargar ranking: ${error.message}`);
  }

  return data ?? [];
}

export async function ensureProgressRow() {
  const user = await getCurrentUser();
  if (!user) return;

  const { data, error } = await supabaseClient
    .from("user_progress")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo verificar progreso: ${error.message}`);
  }

  if (!data) {
    const { error: insertError } = await supabaseClient.from("user_progress").insert({
      user_id: user.id,
      max_level: 1,
      total_score: 0,
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      throw new Error(`No se pudo crear progreso: ${insertError.message}`);
    }
  }
}

function ensureClient() {
  if (!supabaseClient) {
    throw new Error("Supabase no esta inicializado.");
  }
}

function getRuntimeConfig() {
  const cfg = globalThis.SQL_MIND_TRAINER_CONFIG || {};
  const supabaseUrl = cfg.supabaseUrl;
  const supabaseAnonKey = cfg.supabaseAnonKey;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Falta configuracion de Supabase. Define SQL_MIND_TRAINER_CONFIG en config.public.js."
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}

function toMessage(error) {
  if (!error) return "Error desconocido.";
  if (typeof error === "string") return error;
  if (error.message) return error.message;
  return "Error desconocido.";
}
