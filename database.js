/* =================== Supabase Adapter =================== */

const SUPABASE_URL = "https://arknvnqdjqmfvmrkguyz.supabase.co";
const SUPABASE_KEY = "TU_PUBLIC_ANON_KEY_AQUI";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

/* =================== READ =================== */

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

/* =================== CLUBES =================== */

async function crearClub(nombre, ubicacion) {
  return await supabaseClient.from("clubes").insert({
    nombre,
    ubicacion
  });
}

async function actualizarClub(id, nombre, ubicacion) {
  return await supabaseClient
    .from("clubes")
    .update({ nombre, ubicacion })
    .eq("id", id);
}

async function eliminarClubDB(id) {
  await supabaseClient.from("jugadores").delete().eq("club_id", id);
  return await supabaseClient.from("clubes").delete().eq("id", id);
}

/* =================== JUGADORES =================== */

async function crearJugador(data) {
  return await supabaseClient.from("jugadores").insert(data);
}

async function actualizarJugador(id, data) {
  return await supabaseClient
    .from("jugadores")
    .update(data)
    .eq("id", id);
}

async function eliminarJugadorDB(id) {
  return await supabaseClient
    .from("jugadores")
    .delete()
    .eq("id", id);
}

/* =================== TORNEOS FEDERADOS =================== */

async function crearTorneoFederado(data) {
  return await supabaseClient
    .from("torneos_federados")
    .insert(data);
}

async function actualizarTorneoFederado(id, data) {
  return await supabaseClient
    .from("torneos_federados")
    .update(data)
    .eq("id", id);
}

async function eliminarTorneoFederadoDB(id) {
  return await supabaseClient
    .from("torneos_federados")
    .delete()
    .eq("id", id);
}

/* =================== TORNEOS INTERNOS =================== */

async function crearTorneoInterno(data) {
  return await supabaseClient
    .from("torneos_internos")
    .insert(data);
}

async function eliminarTorneoInternoDB(id) {
  return await supabaseClient
    .from("torneos_internos")
    .delete()
    .eq("id", id);
}

/* =================== Exponer global =================== */

window.getDB = getDB;

window.crearClub = crearClub;
window.actualizarClub = actualizarClub;
window.eliminarClubDB = eliminarClubDB;

window.crearJugador = crearJugador;
window.actualizarJugador = actualizarJugador;
window.eliminarJugadorDB = eliminarJugadorDB;

window.crearTorneoFederado = crearTorneoFederado;
window.actualizarTorneoFederado = actualizarTorneoFederado;
window.eliminarTorneoFederadoDB = eliminarTorneoFederadoDB;

window.crearTorneoInterno = crearTorneoInterno;
window.eliminarTorneoInternoDB = eliminarTorneoInternoDB;
