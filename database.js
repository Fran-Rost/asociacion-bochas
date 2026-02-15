/* =================== Supabase Adapter =================== */

const SUPABASE_URL = "https://arknvnqdjqmfvmrkguyz.supabase.co";
const SUPABASE_KEY = "sb_publishable_ZEfS7rs0k7A6rq-2Qu_3eA_i-Bsa7b6"; // anon public key

// OJO: NO llamarlo "supabase"
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

/* =================== API =================== */

async function getDB() {
  const db = {
    clubes: [],
    jugadores: [],
    torneosFederados: [],
    torneosInternos: []
  };

  const { data: clubes } =
    await supabaseClient.from("clubes").select("*");

  const { data: jugadores } =
    await supabaseClient.from("jugadores").select("*");

  const { data: torneosFed } =
    await supabaseClient.from("torneos_federados").select("*");

  const { data: torneosInt } =
    await supabaseClient.from("torneos_internos").select("*");

  db.clubes = clubes || [];
  db.jugadores = jugadores || [];
  db.torneosFederados = torneosFed || [];
  db.torneosInternos = torneosInt || [];

  return db;
}

/* =================== Exponer global =================== */
window.getDB = getDB;

/* =================== GUARDAR CAMBIOS =================== */

async function saveDB(db){

  // ---- CLUBES ----
  for(const c of db.clubes){
    await supabaseClient
      .from("clubes")
      .upsert(c);
  }

  // ---- JUGADORES ----
  for(const j of db.jugadores){
    await supabaseClient
      .from("jugadores")
      .upsert(j);
  }

  // ---- TORNEOS FEDERADOS ----
  for(const t of db.torneosFederados){
    await supabaseClient
      .from("torneos_federados")
      .upsert(t);
  }

  // ---- TORNEOS INTERNOS ----
  for(const t of db.torneosInternos){
    await supabaseClient
      .from("torneos_internos")
      .upsert(t);
  }

  alert("Cambios guardados en Supabase");
}

/* =================== Exponer global =================== */
window.saveDB = saveDB;

