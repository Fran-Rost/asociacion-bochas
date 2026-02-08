const DB_KEY = "bochasDB";

/* =========================
   BASE DE DATOS POR DEFECTO
========================= */
const defaultDB = {
  version: 1,

  /* ===== TORNEOS FEDERADOS ===== */
  torneosFederados: [
    {
      id: 1,
      fecha: "16 de Marzo",
      observacion: "Torneo federado del día",
      inscriptos: {
        "Defensores de Santa Ana": ["Juan Pérez", "Carlos Gómez"],
        "Los Andes": ["Diego Fernández"],
        "Sporting": []
      }
    }
  ],

  /* ===== TORNEOS INTERNOS ===== */
  torneosInternos: [
    {
      organizador: "Defensores de Santa Ana",
      nombre: "Torneo Aniversario",
      fecha: "20 de Abril",
      descripcion: "Torneo interno del club"
    },
    {
      organizador: "Asociación",
      nombre: "Encuentro Regional",
      fecha: "5 de Mayo",
      descripcion: "Encuentro amistoso organizado por la asociación"
    }
  ],

  /* ===== CLUBES ===== */
  clubes: [
    {
      nombre: "Defensores de Santa Ana",
      ubicacion: "Villa Parque Santa Ana",
      jugadores: [
        { nombre: "Juan Pérez", categoria: "Primera", stats: [32,12,8,3,2,1,1,3,2] },
        { nombre: "Carlos Gómez", categoria: "Primera", stats: [28,10,7,4,3,2,1,0,1] },
        { nombre: "Roberto Díaz", categoria: "Segunda", stats: [22,8,6,3,2,1,0,0,0] },
        { nombre: "Miguel Torres", categoria: "Segunda", stats: [20,7,5,3,2,1,1,0,0] },
        { nombre: "Luis Martínez", categoria: "Tercera", stats: [18,6,4,2,1,0,0,0,0] },
        { nombre: "Pedro Sánchez", categoria: "Tercera", stats: [15,5,3,2,1,0,0,0,0] }
      ]
    },

    {
      nombre: "Los Andes",
      ubicacion: "Alta Gracia",
      jugadores: [
        { nombre: "Diego Fernández", categoria: "Primera", stats: [30,9,7,5,4,2,1,1,1] },
        { nombre: "Luis Romero", categoria: "Primera", stats: [27,8,6,4,3,2,1,1,0] },
        { nombre: "Jorge Molina", categoria: "Segunda", stats: [23,7,5,3,2,1,1,0,0] },
        { nombre: "Raúl Benítez", categoria: "Segunda", stats: [21,6,5,3,1,1,0,0,0] },
        { nombre: "Fernando Vega", categoria: "Tercera", stats: [17,5,4,2,1,0,0,0,0] },
        { nombre: "Alejandro Suárez", categoria: "Tercera", stats: [16,4,3,2,1,0,0,0,0] }
      ]
    },

    {
      nombre: "Sporting",
      ubicacion: "Alta Gracia",
      jugadores: [
        { nombre: "Hernán López", categoria: "Primera", stats: [29,9,7,4,3,2,2,1,1] },
        { nombre: "Pablo Acosta", categoria: "Primera", stats: [26,8,6,4,2,1,1,1,0] },
        { nombre: "Gustavo Ríos", categoria: "Segunda", stats: [22,7,5,3,2,1,0,0,0] },
        { nombre: "Martín Peralta", categoria: "Segunda", stats: [20,6,4,3,1,1,0,0,0] },
        { nombre: "Nicolás Cruz", categoria: "Tercera", stats: [18,5,4,2,1,0,0,0,0] },
        { nombre: "Sergio Navarro", categoria: "Tercera", stats: [16,4,3,2,1,0,0,0,0] }
      ]
    }
  ]
};

/* =========================
   FUNCIONES DB (NO TOCAR)
========================= */
function getDB() {
  const data = localStorage.getItem(DB_KEY);
  if (!data) {
    localStorage.setItem(DB_KEY, JSON.stringify(defaultDB));
    return structuredClone(defaultDB);
  }
  return JSON.parse(data);
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}
