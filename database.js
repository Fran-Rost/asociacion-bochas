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
    await supabaseClient
      .from("torneos_internos")
      .select("id, organizador_id, nombre, fecha, descripcion, clubes:organizador_id(nombre)");

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

  const clubes = db?.clubes || [];
  const jugadores = db?.jugadores || [];
  const torneosFederados = db?.torneosFederados || [];
  const torneosInternos = db?.torneosInternos || [];

  // ---- CLUBES ----
  const clubesPayload = clubes.map(c => ({
    id: c.id,
    nombre: c.nombre,
    ubicacion: c.ubicacion
  }));

  const { error: clubesError } = await supabaseClient
    .from("clubes")
    .upsert(clubesPayload);

  if (clubesError) {
    console.error("Error guardando clubes:", clubesError);
    throw clubesError;
  }

  // ---- JUGADORES ----
  for (const j of jugadores) {
    const payload = {
      nombre: j.nombre,
      categoria: j.categoria,
      club_id: j.club_id,
      torneos: j.torneos,
      ronda1: j.ronda1,
      zona: j.zona,
      dieciseisavos: j.dieciseisavos,
      octavos: j.octavos,
      cuartos: j.cuartos,
      semifinal: j.semifinal,
      subcampeon: j.subcampeon,
      campeon: j.campeon
    };

    let error;

    if (j.id) {
      ({ error } = await supabaseClient
        .from("jugadores")
        .update(payload)
        .eq("id", j.id));
    } else {
      ({ error } = await supabaseClient
        .from("jugadores")
        .insert(payload));
    }

    if (error) {
      console.error("Error guardando jugador:", j, error);
      throw error;
    }
  }

  // ---- TORNEOS FEDERADOS ----
  const { error: fedError } = await supabaseClient
    .from("torneos_federados")
    .upsert(torneosFederados);

  if (fedError) {
    console.error("Error guardando torneos federados:", fedError);
    throw fedError;
  }

  // ---- TORNEOS INTERNOS ----
  const torneosInternosPayload = torneosInternos.map(t => ({
    id: t.id,
    organizador_id: t.organizador_id || null,
    nombre: t.nombre,
    fecha: t.fecha,
    descripcion: t.descripcion
  }));

  const { error: intError } = await supabaseClient
    .from("torneos_internos")
    .upsert(torneosInternosPayload);

  if (intError) {
    console.error("Error guardando torneos internos:", intError);
    throw intError;
  }

  alert("Cambios guardados en Supabase");
}

/* =================== Exponer global =================== */
window.saveDB = saveDB;

