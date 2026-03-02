/* =================== Supabase Adapter =================== */

const SUPABASE_URL = "https://arknvnqdjqmfvmrkguyz.supabase.co";
const SUPABASE_KEY = "sb_publishable_ZEfS7rs0k7A6rq-2Qu_3eA_i-Bsa7b6";

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
    torneosInternos: [],
    torneoFederadoInscriptos: [],
    torneosNuevos: [],
    novedades: [] // Nueva sección
  };

  const { data: clubes } = await supabaseClient.from("clubes").select("*");
  const { data: jugadores } = await supabaseClient.from("jugadores").select("*");
  const { data: torneosFed } = await supabaseClient.from("torneos_federados").select("*");
  const { data: novedades } = await supabaseClient.from("novedades").select("*").order('created_at', { ascending: false });

  const { data: torneosInt } = await supabaseClient
      .from("torneos_internos")
      .select("id, organizador_id, nombre, fecha, descripcion");

  const { data: torneosFedInscriptos } = await supabaseClient
      .from("torneo_federado_inscriptos")
      .select("id, torneo_id, club_id, jugador_id");

  const { data: torneosNuevos, error: torneosNuevosError } = await supabaseClient
    .from("torneos_nuevos")
    .select("*");

  if (torneosNuevosError) console.warn("No se pudo leer torneos_nuevos:", torneosNuevosError.message);

  db.clubes = clubes || [];
  db.jugadores = jugadores || [];
  db.novedades = novedades || [];
  db.torneoFederadoInscriptos = torneosFedInscriptos || [];
  db.torneosNuevos = torneosNuevos || [];

  // Mapeo de Federados con Inscriptos
  db.torneosFederados = (torneosFed || []).map(torneo => {
    const inscriptos = {};
    db.clubes.forEach(club => { inscriptos[club.nombre] = []; });

    db.torneoFederadoInscriptos
      .filter(i => i.torneo_id === torneo.id)
      .forEach(i => {
        const club = db.clubes.find(c => c.id === i.club_id);
        const jugador = db.jugadores.find(j => j.id === i.jugador_id);
        if (club && jugador) inscriptos[club.nombre].push(jugador.nombre);
      });

    return { ...torneo, inscriptos };
  });

  // Mapeo de Internos con Club Organizador
  db.torneosInternos = (torneosInt || []).map(torneo => {
    const club = db.clubes.find(c => c.id === torneo.organizador_id);
    return { ...torneo, clubes: club ? { nombre: club.nombre } : null };
  });

  return db;
}

/* =================== SAVE (SYNC) =================== */

async function syncTable(table, rows, options = {}) {
  const stripFields = options.stripFields || [];
  const cleanedRows = rows.map(row => {
    const next = { ...row };
    stripFields.forEach(field => delete next[field]);
    return next;
  });

  const rowsWithId = cleanedRows.filter(r => r.id != null);
  const rowsWithoutId = cleanedRows.filter(r => r.id == null);

  for (const row of rowsWithId) {
    const { id, ...payload } = row;
    await supabaseClient.from(table).update(payload).eq("id", id);
  }

  let insertedRows = [];
  if (rowsWithoutId.length > 0) {
    const { data } = await supabaseClient.from(table).insert(rowsWithoutId).select("*");
    insertedRows = data || [];
  }
  return [...rowsWithId, ...insertedRows];
}

async function saveDB(db) {
  const clubes = await syncTable("clubes", db.clubes || []);
  const jugadores = await syncTable("jugadores", db.jugadores || []);
  
  const torneosFederadosNormalizados = (db.torneosFederados || []).map(t => {
    const next = { ...t };
    if (next.descripcion == null && next.observacion != null) next.descripcion = next.observacion;
    delete next.observacion;
    return next;
  });

  const torneosFederados = await syncTable("torneos_federados", torneosFederadosNormalizados, { stripFields: ["inscriptos"] });
  const torneosInternos = await syncTable("torneos_internos", db.torneosInternos || [], { stripFields: ["clubes"] });
  const torneosNuevos = await syncTable("torneos_nuevos", db.torneosNuevos || []);

  return { clubes, jugadores, torneosFederados, torneosInternos, torneosNuevos };
}

/* =================== NOVEDADES =================== */

async function crearNovedad(titulo, descripcion, imagen_url = null) {
  return await supabaseClient.from("novedades").insert({ titulo, descripcion, imagen_url });
}

async function eliminarNovedadDB(id) {
  return await supabaseClient.from("novedades").delete().eq("id", id);
}

/* =================== STORAGE (IMÁGENES) =================== */

async function subirImagen(file, bucket = "novedades") {
  if (!file) return { data: null, error: new Error("Sin archivo") };

  const extension = file.name.split(".").pop();
  const fileName = `${Date.now()}.${extension}`;

  const { data, error } = await supabaseClient.storage
    .from(bucket)
    .upload(fileName, file);

  if (error) return { data: null, error };

  const { data: publicData } = supabaseClient.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return { data: { publicUrl: publicData.publicUrl }, error: null };
}

/* =================== OTROS (CLUBES / JUGADORES) =================== */

async function crearClub(nombre, ubicacion, logo_url = null) {
  return await supabaseClient.from("clubes").insert({ nombre, ubicacion, logo_url });
}

async function eliminarClubDB(id) {
  await supabaseClient.from("jugadores").delete().eq("club_id", id);
  return await supabaseClient.from("clubes").delete().eq("id", id);
}

async function crearJugador(data) {
  return await supabaseClient.from("jugadores").insert(data);
}

async function eliminarJugadorDB(id) {
  return await supabaseClient.from("jugadores").delete().eq("id", id);
}

/* =================== EXPOSICIÓN GLOBAL =================== */

window.getDB = getDB;
window.saveDB = saveDB;
window.crearClub = crearClub;
window.eliminarClubDB = eliminarClubDB;
window.crearJugador = crearJugador;
window.eliminarJugadorDB = eliminarJugadorDB;
window.crearNovedad = crearNovedad;
window.eliminarNovedadDB = eliminarNovedadDB;
window.subirImagen = subirImagen;
