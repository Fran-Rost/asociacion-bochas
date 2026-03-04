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
    novedades: [] // Se agrega soporte para novedades
  };

  const { data: clubes } = await supabaseClient.from("clubes").select("*");
  const { data: jugadores } = await supabaseClient.from("jugadores").select("*");
  const { data: torneosFed } = await supabaseClient.from("torneos_federados").select("*");
  const { data: torneosInt } = await supabaseClient.from("torneos_internos").select("id, organizador_id, nombre, fecha, descripcion");
  const { data: torneosFedInscriptos } = await supabaseClient.from("torneo_federado_inscriptos").select("id, torneo_id, club_id, jugador_id");
  const { data: torneosNuevos } = await supabaseClient.from("torneos_nuevos").select("*");
  const { data: novedades } = await supabaseClient.from("novedades").select("*");

  db.clubes = clubes || [];
  db.jugadores = jugadores || [];
  db.torneoFederadoInscriptos = torneosFedInscriptos || [];
  db.torneosNuevos = torneosNuevos || [];
  db.novedades = novedades || [];

  // Mapeo de Inscriptos para Torneos Federados
  db.torneosFederados = (torneosFed || []).map(torneo => {
    const inscriptos = {};
    db.clubes.forEach(club => {
      inscriptos[club.nombre] = [];
    });

    db.torneoFederadoInscriptos
      .filter(i => i.torneo_id === torneo.id)
      .forEach(i => {
        const club = db.clubes.find(c => c.id === i.club_id);
        const jugador = db.jugadores.find(j => j.id === i.jugador_id);
        if (!club || !jugador) return;
        if (!inscriptos[club.nombre]) inscriptos[club.nombre] = [];
        inscriptos[club.nombre].push(jugador.nombre);
      });

    return { ...torneo, inscriptos };
  });

  // Mapeo de Organizadores para Torneos Internos
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
    const { error: updateError } = await supabaseClient
      .from(table)
      .update(payload)
      .eq("id", id);
    if (updateError) throw updateError;
  }

  let insertedRows = [];
  if (rowsWithoutId.length > 0) {
    const { data, error: insertError } = await supabaseClient
      .from(table)
      .insert(rowsWithoutId)
      .select("*");
    if (insertError) throw insertError;
    insertedRows = data || [];
  }

  return [...rowsWithId, ...insertedRows];
}

async function saveDB(db) {
  // Sincronización de tablas básicas
  const clubes = await syncTable("clubes", db.clubes || []);
  const jugadores = await syncTable("jugadores", db.jugadores || []);
  const novedades = await syncTable("novedades", db.novedades || []); // Nueva tabla sincronizada
  const torneosNuevos = await syncTable("torneos_nuevos", db.torneosNuevos || []);

  // Normalización y sincronización de Torneos Federados
  const torneosFederadosNormalizados = (db.torneosFederados || []).map(torneo => {
    const next = { ...torneo };
    if (next.descripcion == null && next.observacion != null) {
      next.descripcion = next.observacion;
    }
    delete next.observacion;
    return next;
  });

  const torneosFederados = await syncTable(
    "torneos_federados",
    torneosFederadosNormalizados,
    { stripFields: ["inscriptos"] }
  );

  // Sincronización de Torneos Internos
  const torneosInternos = await syncTable(
    "torneos_internos",
    db.torneosInternos || [],
    { stripFields: ["clubes"] }
  );

  // Manejo de Inscriptos (Relaciones muchos a muchos)
  const rowsInscriptos = [];
  const uniqueInscriptos = new Set();

  (db.torneosFederados || []).forEach(torneo => {
    const torneoPersistido = torneosFederados.find(t => t.id === torneo.id);
    if (!torneoPersistido || !torneo.inscriptos) return;

    Object.entries(torneo.inscriptos).forEach(([clubNombre, jugadoresNombres]) => {
      const club = clubes.find(c => c.nombre === clubNombre);
      if (!club || !Array.isArray(jugadoresNombres)) return;

      jugadoresNombres.forEach(jugadorNombre => {
        const jugador = jugadores.find(
          j => j.nombre === jugadorNombre && j.club_id === club.id
        );
        if (!jugador) return;

        const uniqueKey = `${torneoPersistido.id}-${club.id}-${jugador.id}`;
        if (uniqueInscriptos.has(uniqueKey)) return;
        uniqueInscriptos.add(uniqueKey);

        rowsInscriptos.push({
          torneo_id: torneoPersistido.id,
          club_id: club.id,
          jugador_id: jugador.id
        });
      });
    });
  });

  // Limpiar y reinsertar inscriptos
  const { error: deleteInscriptosError } = await supabaseClient
    .from("torneo_federado_inscriptos")
    .delete()
    .not("id", "is", null);

  if (deleteInscriptosError) throw deleteInscriptosError;

  if (rowsInscriptos.length > 0) {
    const { error: insertInscriptosError } = await supabaseClient
      .from("torneo_federado_inscriptos")
      .upsert(rowsInscriptos, {
        onConflict: "torneo_id,club_id,jugador_id",
        ignoreDuplicates: true
      });
    if (insertInscriptosError) throw insertInscriptosError;
  }

  return {
    clubes,
    jugadores,
    novedades,
    torneosFederados,
    torneosInternos,
    torneosNuevos,
    torneoFederadoInscriptos: rowsInscriptos
  };
}

/* =================== STORAGE (IMÁGENES) =================== */

// Volvemos a poner la función anterior para no romper nada en el Admin
async function subirLogoClub(file) {
  return await subirImagen(file, 'clubes-logos');
}

async function subirImagen(file, bucket = "clubes-logos") {
  if (!file) return { data: null, error: new Error("Archivo inválido") };

  const extension = (file.name.split(".").pop() || "png").toLowerCase();
  const safeName = (file.name || "upload").replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
  const filename = `${Date.now()}-${safeName}`;

  const { data, error } = await supabaseClient
    .storage
    .from(bucket)
    .upload(filename, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || `image/${extension}`
    });

  if (error) return { data: null, error };

  const { data: publicData } = supabaseClient
    .storage
    .from(bucket)
    .getPublicUrl(data.path);

  return {
    data: { ...data, publicUrl: publicData?.publicUrl || null },
    error: null
  };
}

/* =================== CLUBES =================== */

async function crearClub(nombre, ubicacion, logo_url = null) {
  return await supabaseClient.from("clubes").insert({ nombre, ubicacion, logo_url });
}

async function actualizarClub(id, nombre, ubicacion, logo_url = null) {
  return await supabaseClient
    .from("clubes")
    .update({ nombre, ubicacion, logo_url })
    .eq("id", id);
}

async function eliminarClubDB(id) {
  await supabaseClient.from("jugadores").delete().eq("club_id", id);
  return await supabaseClient.from("clubes").delete().eq("id", id);
}

/* =================== NOVEDADES =================== */

async function eliminarNovedadDB(id) {
  return await supabaseClient.from("novedades").delete().eq("id", id);
}

/* =================== OTROS =================== */

async function eliminarJugadorDB(id) {
  return await supabaseClient.from("jugadores").delete().eq("id", id);
}

async function eliminarTorneoFederadoDB(id) {
  return await supabaseClient.from("torneos_federados").delete().eq("id", id);
}

async function eliminarTorneoInternoDB(id) {
  return await supabaseClient.from("torneos_internos").delete().eq("id", id);
}

/* =================== Exponer global =================== */

window.getDB = getDB;
window.saveDB = saveDB;
window.syncTable = syncTable;
window.subirLogoClub = subirLogoClub; // Restablecida
window.subirImagen = subirImagen;     // Nueva para Novedadeswindow.crearClub = crearClub;
window.crearClub = crearClub;          // Esta línea estaba pegada a la anterior
window.actualizarClub = actualizarClub;
window.eliminarClubDB = eliminarClubDB;
window.eliminarNovedadDB = eliminarNovedadDB;
window.eliminarJugadorDB = eliminarJugadorDB;
window.eliminarTorneoFederadoDB = eliminarTorneoFederadoDB;
window.eliminarTorneoInternoDB = eliminarTorneoInternoDB;
window.supabaseClient = supabaseClient;

