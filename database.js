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
    torneosInternos: [],
    torneoFederadoInscriptos: []
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
      .select("id, organizador_id, nombre, fecha, descripcion");

  const { data: torneosFedInscriptos } =
    await supabaseClient
      .from("torneo_federado_inscriptos")
      .select("id, torneo_id, club_id, jugador_id");

  db.clubes = clubes || [];
  db.jugadores = jugadores || [];
  db.torneoFederadoInscriptos = torneosFedInscriptos || [];

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

    return {
      ...torneo,
      inscriptos
    };
  });

  db.torneosInternos = (torneosInt || []).map(torneo => {
    const club = db.clubes.find(c => c.id === torneo.organizador_id);
    return {
      ...torneo,
      clubes: club ? { nombre: club.nombre } : null
    };
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
  const clubes = await syncTable("clubes", db.clubes || []);
  const jugadores = await syncTable("jugadores", db.jugadores || []);
  const torneosFederados = await syncTable(
    "torneos_federados",
    db.torneosFederados || [],
    { stripFields: ["inscriptos"] }
  );
  const torneosInternos = await syncTable(
    "torneos_internos",
    db.torneosInternos || [],
    { stripFields: ["clubes"] }
  );

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
    torneosFederados,
    torneosInternos,
    torneoFederadoInscriptos: rowsInscriptos
  };
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
window.saveDB = saveDB;

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

