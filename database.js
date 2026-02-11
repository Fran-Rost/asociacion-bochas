/* =====================================================
   DATABASE ADAPTER - SUPABASE
   Mantiene la misma interfaz:
   - getDB()
   - saveDB(db)
   ===================================================== */

/* ===== Supabase client ===== */
const SUPABASE_URL = "https://arknvnqdjqmfvmrkguyz.supabase.co";
const SUPABASE_KEY = "TU_ANON_PUBLIC_KEY"; // SOLO anon / publishable

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

/* =====================================================
   GET DB
   Devuelve la MISMA estructura que usaba localStorage
   ===================================================== */
async function getDB() {
  const db = {
    clubes: [],
    torneosFederados: [],
    torneosInternos: []
  };

  /* ---------- CLUBES ---------- */
  const { data: clubes, error: clubesErr } =
    await supabase.from("clubes").select("*");

  if (clubesErr) {
    console.error("Error clubes:", clubesErr);
    return db;
  }

  /* ---------- JUGADORES ---------- */
  const { data: jugadores, error: jugadoresErr } =
    await supabase.from("jugadores").select("*");

  if (jugadoresErr) {
    console.error("Error jugadores:", jugadoresErr);
    return db;
  }

  /* Agrupar jugadores dentro de clubes */
  db.clubes = clubes.map(club => ({
    nombre: club.nombre,
    ubicacion: club.ubicacion,
    jugadores: jugadores
      .filter(j => j.club_id === club.id)
      .map(j => ({
        nombre: j.nombre,
        categoria: j.categoria,
        stats: typeof j.stats === "string"
          ? JSON.parse(j.stats)
          : j.stats
      }))
  }));

  /* ---------- TORNEOS FEDERADOS ---------- */
  const { data: torneosFed } =
    await supabase.from("torneos_federados").select("*");

  const { data: inscriptos } =
    await supabase.from("torneo_federado_inscriptos").select("*");

  if (torneosFed) {
    db.torneosFederados = torneosFed.map(t => {
      const ins = {};

      inscriptos
        ?.filter(i => i.torneo_id === t.id)
        .forEach(i => {
          const club = clubes.find(c => c.id === i.club_id);
          const jugador = jugadores.find(j => j.id === i.jugador_id);

          if (!club || !jugador) return;

          if (!ins[club.nombre]) ins[club.nombre] = [];
          ins[club.nombre].push(jugador.nombre);
        });

      return {
        id: t.id,
        fecha: t.fecha,
        observacion: t.observacion,
        inscriptos: ins
      };
    });
  }

  /* ---------- TORNEOS INTERNOS ---------- */
  const { data: torneosInt } =
    await supabase.from("torneos_internos").select("*");

  if (torneosInt) {
    db.torneosInternos = torneosInt.map(t => ({
      nombre: t.nombre,
      fecha: t.fecha,
      organizador: t.organizador_id
        ? clubes.find(c => c.id === t.organizador_id)?.nombre || ""
        : "",
      descripcion: t.descripcion
    }));
  }

  return db;
}

/* =====================================================
   SAVE DB
   (por ahora SOLO admin, implementación básica)
   ===================================================== */
async function saveDB(db) {
  console.warn(
    "saveDB aún no está implementado completamente.",
    "Por ahora solo lectura desde Supabase."
  );
}
