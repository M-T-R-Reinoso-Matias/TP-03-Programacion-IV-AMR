// routes/notas.js
import express from "express";
import { body, param } from "express-validator";
import { validarCampos } from "../middlewares/validar.js";
import { db } from "../db.js";

const router = express.Router();

// Crear o actualizar notas
router.post(
  "/",
  [
    body("alumno_id").isInt().withMessage("alumno_id invalido"),
    body("materia_id").isInt().withMessage("materia_id invalido"),
    body("nota1").optional().isFloat({ min: 0, max: 10 }).withMessage("nota1 fuera de rango"),
    body("nota2").optional().isFloat({ min: 0, max: 10 }).withMessage("nota2 fuera de rango"),
    body("nota3").optional().isFloat({ min: 0, max: 10 }).withMessage("nota3 fuera de rango"),
    validarCampos,
  ],
  async (req, res) => {
    const { alumno_id, materia_id, nota1 = null, nota2 = null, nota3 = null } = req.body;

    try {
      // Validar existencia de alumno y materia
      const [alumnoRows] = await db.query("SELECT id FROM alumno WHERE id = ?", [alumno_id]);
      if (alumnoRows.length === 0)
        return res.status(404).json({ ok: false, error: "Alumno no encontrado" });

      const [materiaRows] = await db.query("SELECT id FROM materia WHERE id = ?", [materia_id]);
      if (materiaRows.length === 0)
        return res.status(404).json({ ok: false, error: "Materia no encontrada" });

      // Verificar si ya existen notas para este alumno y materia
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

      // Obtener la fila actualizada/creada
      const [notaRows] = await db.query(
        "SELECT id, alumno_id, materia_id, nota1, nota2, nota3 FROM nota WHERE alumno_id = ? AND materia_id = ?",
        [alumno_id, materia_id]
      );

      return res
        .status(exists.length ? 200 : 201)
        .json({
          ok: true,
          nota: notaRows[0],
          message: exists.length ? "Notas actualizadas" : "Notas creadas",
        });

    } catch (err) {
      console.error("Error en POST /notas:", err);
      return res.status(500).json({ ok: false, error: "Error interno del servidor" });
    }
  }
);

// Obtener todas las notas de un alumno con promedio por materia
router.get(
  "/alumno/:id",
  [param("id").isInt().withMessage("id invalido"), validarCampos],
  async (req, res) => {
    const alumnoId = req.params.id;
    try {
      // Verificar que el alumno exista
      const [alumnoRows] = await db.query("SELECT id FROM alumno WHERE id = ?", [alumnoId]);
      if (alumnoRows.length === 0)
        return res.status(404).json({ ok: false, error: "Alumno no encontrado" });

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
        const n1 = r.nota1 !== null ? Number(r.nota1) : null;
        const n2 = r.nota2 !== null ? Number(r.nota2) : null;
        const n3 = r.nota3 !== null ? Number(r.nota3) : null;

        const arr = [n1, n2, n3].filter((v) => v !== null && !Number.isNaN(v));
        const promedio = arr.length
          ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2))
          : null;

        return {
          materia_id: r.materia_id,
          materia: r.materia,
          nota1: n1,
          nota2: n2,
          nota3: n3,
          promedio,
        };
      });

      return res.json({ ok: true, notas: result });
    } catch (err) {
      console.error("Error GET /notas/alumno/:id", err);
      return res.status(500).json({ ok: false, error: "Error interno del servidor" });
    }
  }
);

// Obtener promedio por materia (todos los alumnos)
router.get(
  "/materia/:id",
  [param("id").isInt().withMessage("id invalido"), validarCampos],
  async (req, res) => {
    const materiaId = req.params.id;
    try {
      // Verificar que la materia exista
      const [materiaRows] = await db.query("SELECT id FROM materia WHERE id = ?", [materiaId]);
      if (materiaRows.length === 0)
        return res.status(404).json({ ok: false, error: "Materia no encontrada" });

      // Obtener las notas
      const [rows] = await db.query(
        `SELECT a.id AS alumno_id, a.nombre, a.apellido, n.nota1, n.nota2, n.nota3
         FROM alumno a
         LEFT JOIN nota n ON n.alumno_id = a.id AND n.materia_id = ?
         ORDER BY a.apellido, a.nombre`,
        [materiaId]
      );

      const result = rows.map((r) => {
        const n1 = r.nota1 !== null ? Number(r.nota1) : null;
        const n2 = r.nota2 !== null ? Number(r.nota2) : null;
        const n3 = r.nota3 !== null ? Number(r.nota3) : null;

        const arr = [n1, n2, n3].filter((v) => v !== null && !Number.isNaN(v));
        const promedio = arr.length
          ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2))
          : null;

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

      const proms = result.filter((r) => r.promedio !== null).map((r) => r.promedio);
      const promedio_materia = proms.length
        ? Number((proms.reduce((a, b) => a + b, 0) / proms.length).toFixed(2))
        : null;

      return res.json({ ok: true, promedio_materia, alumnos: result });
    } catch (err) {
      console.error("Error GET /notas/materia/:id", err);
      return res.status(500).json({ ok: false, error: "Error interno del servidor" });
    }
  }
);

export default router;
