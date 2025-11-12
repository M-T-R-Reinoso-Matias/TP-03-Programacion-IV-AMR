import express from "express";
import { body, param } from "express-validator";
import { validarCampos } from "../middlewares/validar.js";
import { db } from "../db.js";

const router = express.Router();

// Funciones auxiliares
function parseNotasRow(row) {
  const n1 = row.nota1 !== null ? Number(row.nota1) : null;
  const n2 = row.nota2 !== null ? Number(row.nota2) : null;
  const n3 = row.nota3 !== null ? Number(row.nota3) : null;
  return { n1, n2, n3 };
}

function calcPromedio(...vals) {
  const arr = vals.filter((v) => v !== null && !Number.isNaN(v));
  if (!arr.length) return null;
  return Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2));
}

// permitir tablas controladas para evitar inyección de nombres de tabla
const ALLOWED_TABLES = new Set(["alumno", "materia"]);
async function existsTableId(table, id) {
  if (!ALLOWED_TABLES.has(table)) throw new Error("Tabla no permitida");
  const [rows] = await db.query(`SELECT id FROM ${table} WHERE id = ?`, [id]);
  return rows.length > 0;
}

// Crear o actualizar nota
router.post(
  "/",
  [
    body("alumno_id").isInt().withMessage("alumno_id inválido"),
    body("materia_id").isInt().withMessage("materia_id inválido"),
    body("nota1").optional().isFloat({ min: 0, max: 10 }).withMessage("nota1 fuera de rango"),
    body("nota2").optional().isFloat({ min: 0, max: 10 }).withMessage("nota2 fuera de rango"),
    body("nota3").optional().isFloat({ min: 0, max: 10 }).withMessage("nota3 fuera de rango"),
    validarCampos,
  ],
  async (req, res) => {
    const { alumno_id, materia_id, nota1 = null, nota2 = null, nota3 = null } = req.body;

    try {
      // validar existencia alumno/materia
      const alumnoExists = await existsTableId("alumno", alumno_id);
      if (!alumnoExists) return res.status(404).json({ ok: false, mensaje: "Alumno no encontrado" });

      const materiaExists = await existsTableId("materia", materia_id);
      if (!materiaExists) return res.status(404).json({ ok: false, mensaje: "Materia no encontrada" });

      // verificar si ya existe la nota
      const [exists] = await db.query(
        "SELECT id FROM nota WHERE alumno_id = ? AND materia_id = ?",
        [alumno_id, materia_id]
      );

      // Si existen notas, se actualizan; si no, se crean
      if (exists.length) {
        await db.query(
          "UPDATE nota SET nota1 = ?, nota2 = ?, nota3 = ? WHERE alumno_id = ? AND materia_id = ?",
          [nota1, nota2, nota3, alumno_id, materia_id]
        );
      } else {
        await db.query(
          "INSERT INTO nota (alumno_id, materia_id, nota1, nota2, nota3) VALUES (?,?,?,?,?)",
          [alumno_id, materia_id, nota1, nota2, nota3]
        );
      }

      // devolver la nota actualizada/creada
      const [notaRows] = await db.query(
        "SELECT id, alumno_id, materia_id, nota1, nota2, nota3 FROM nota WHERE alumno_id = ? AND materia_id = ?",
        [alumno_id, materia_id]
      );

      if (!notaRows.length) {
        return res.status(500).json({ ok: false, mensaje: "No se pudo obtener la nota creada/actualizada" });
      }

      const row = notaRows[0];
      const { n1, n2, n3 } = parseNotasRow(row);
      const promedio = calcPromedio(n1, n2, n3);

      return res.status(exists.length ? 200 : 201).json({
        ok: true,
        data: {
          nota: {
            id: row.id,
            alumno_id: row.alumno_id,
            materia_id: row.materia_id,
            nota1: n1,
            nota2: n2,
            nota3: n3,
            promedio,
          }
        },
      });
    } catch (err) {
      console.error("POST /notas:", err);
      return res.status(500).json({ ok: false, mensaje: "Error interno del servidor" });
    }
  }
);

// Obtener todas las notas de un alumno con promedio por materia
router.get(
  "/alumno/:id",
  [param("id").isInt().withMessage("id inválido"), validarCampos],
  async (req, res) => {
    const alumnoId = req.params.id;
    try {
      // verificar existencia del alumno
      const alumnoExists = await existsTableId("alumno", alumnoId);
      if (!alumnoExists) return res.status(404).json({ ok: false, mensaje: "Alumno no encontrado" });

      // Obtener sus notas
      const [rows] = await db.query(
        `SELECT m.id AS materia_id, m.nombre AS materia,
                n.nota1, n.nota2, n.nota3
         FROM materia m
         LEFT JOIN nota n ON n.materia_id = m.id AND n.alumno_id = ?
         ORDER BY m.nombre`,
        [alumnoId]
      );

      const result = rows.map((r) => {
        const { n1, n2, n3 } = parseNotasRow(r);
        const promedio = calcPromedio(n1, n2, n3);
        return {
          materia_id: r.materia_id,
          materia: r.materia,
          nota1: n1,
          nota2: n2,
          nota3: n3,
          promedio,
        };
      });

      // Calcular promedio general del alumno
      const proms = result.filter((r) => r.promedio !== null).map((r) => r.promedio);
      const promedio_general = proms.length
        ? Number((proms.reduce((a, b) => a + b, 0) / proms.length).toFixed(2))
        : null;

      // Devolver notas y promedio general en formato consistente
      return res.json({ ok: true, data: { notas: result, promedio_general } });
    } catch (err) {
      console.error("GET /notas/alumno/:id", err);
      return res.status(500).json({ ok: false, mensaje: "Error interno del servidor" });
    }
  }
);

// Obtener promedio por materia y listado de alumnos con sus notas
router.get(
  "/materia/:id",
  [param("id").isInt().withMessage("id inválido"), validarCampos],
  async (req, res) => {
    const materiaId = req.params.id;
    try {
      // verificar existencia materia
      const materiaExists = await existsTableId("materia", materiaId);
      if (!materiaExists) return res.status(404).json({ ok: false, mensaje: "Materia no encontrada" });

      // Obtener las notas
      const [rows] = await db.query(
        `SELECT a.id AS alumno_id, a.nombre, a.apellido, n.nota1, n.nota2, n.nota3
         FROM alumno a
         LEFT JOIN nota n ON n.alumno_id = a.id AND n.materia_id = ?
         ORDER BY a.apellido, a.nombre`,
        [materiaId]
      );

      const result = rows.map((r) => {
        const { n1, n2, n3 } = parseNotasRow(r);
        const promedio = calcPromedio(n1, n2, n3);
        return {
          alumno_id: r.alumno_id,
          nombre: r.nombre,
          apellido: r.apellido,
          nota1: n1,
          nota2: n2,
          nota3: n3,
          promedio,
        };
      });

      // Calcular promedio de la materia
      const proms = result.filter((r) => r.promedio !== null).map((r) => r.promedio);
      const promedio_materia = proms.length ? Number((proms.reduce((a, b) => a + b, 0) / proms.length).toFixed(2)) : null;

      // Respuesta consistente
      return res.json({ ok: true, data: { promedio_materia, alumnos: result } });
    } catch (err) {
      console.error("GET /notas/materia/:id", err);
      return res.status(500).json({ ok: false, mensaje: "Error interno del servidor" });
    }
  }
);

export default router;
