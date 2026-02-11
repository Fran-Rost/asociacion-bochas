/* =================== Supabase Adapter =================== */

const SUPABASE_URL = "https://arknvnqdjqmfvmrkguyz.supabase.co";
const SUPABASE_KEY = "sb_publishable_XXXXXXXXXXXX"; // anon public key

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
