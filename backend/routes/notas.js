import express from "express";
import { body, param } from "express-validator";
import { validarCampos } from "../middlewares/validar.js";
import { db } from "../db.js";

const router = express.Router();

// Crear y actualizar notas
router.post(
  "/",
  [
    body("alumno_id").isInt().withMessage("alumno_id invalido"),
    body("materia_id").isInt().withMessage("materia_id invalido"),
    body("nota1").optional().isFloat({ min: 0, max: 10 }),
    body("nota2").optional().isFloat({ min: 0, max: 10 }),
    body("nota3").optional().isFloat({ min: 0, max: 10 }),
  ],
  validarCampos,
  async (req, res) => {
    const { alumno_id, materia_id, nota1 = null, nota2 = null, nota3 = null } = req.body;
    try {
      const [exists] = await db.query(
        "SELECT id FROM nota WHERE alumno_id = ? AND materia_id = ?",
        [alumno_id, materia_id]
      );
      if (exists.length) {
        await db.query(
          "UPDATE nota SET nota1 = ?, nota2 = ?, nota3 = ? WHERE alumno_id = ? AND materia_id = ?",
          [nota1, nota2, nota3, alumno_id, materia_id]
        );
        return res.json({ mensaje: "Notas actualizadas" });
      } else {
        const [result] = await db.query(
          "INSERT INTO nota (alumno_id, materia_id, nota1, nota2, nota3) VALUES (?,?,?,?,?)",
          [alumno_id, materia_id, nota1, nota2, nota3]
        );
        return res.status(201).json({ id: result.insertId, mensaje: "Notas creadas" });
      }
    } catch (err) {
      res.status(500).json({ mensaje: "Error interno del servidor" });
    }
  }
);

// Obtener todas las notas de un alumno con promedio por materia
router.get("/alumno/:id", [param("id").isInt()], validarCampos, async (req, res) => {
  const alumnoId = req.params.id;
  try {
    const [rows] = await db.query(
      `SELECT m.id AS materia_id, m.nombre AS materia,
        n.nota1, n.nota2, n.nota3,
        (
          (COALESCE(n.nota1,0) + COALESCE(n.nota2,0) + COALESCE(n.nota3,0))
          /
          NULLIF( ( (n.nota1 IS NOT NULL) + (n.nota2 IS NOT NULL) + (n.nota3 IS NOT NULL) ), 0)
        ) AS promedio
       FROM materia m
       LEFT JOIN nota n ON n.materia_id = m.id AND n.alumno_id = ?
       ORDER BY m.nombre`,
      [alumnoId]
    );
    // Si la consulta falla por el casting, haremos la calculadora en JS abajo.
    return res.json(rows);
  } catch (err) {
    // calcular en JS
    try {
      const [materias] = await db.query("SELECT id, nombre FROM materia ORDER BY nombre");
      const [notas] = await db.query("SELECT materia_id, nota1, nota2, nota3 FROM nota WHERE alumno_id = ?", [alumnoId]);

      const mapNotas = {};
      notas.forEach(n => (mapNotas[n.materia_id] = n));

      const result = materias.map(m => {
        const n = mapNotas[m.id] || { nota1: null, nota2: null, nota3: null };
        const arr = [n.nota1, n.nota2, n.nota3].filter(v => v !== null);
        const promedio = arr.length ? arr.reduce((a, b) => a + parseFloat(b), 0) / arr.length : null;
        return { materia_id: m.id, materia: m.nombre, nota1: n.nota1, nota2: n.nota2, nota3: n.nota3, promedio };
      });
      return res.json(result);
    } catch (err2) {
      return res.status(500).json({ mensaje: "Error interno del servidor" });
    }
  }
});

// Obtener promedio por materia (todos los alumnos)
router.get("/materia/:id", [param("id").isInt()], validarCampos, async (req, res) => {
  const materiaId = req.params.id;
  try {
    const [rows] = await db.query(
      `SELECT a.id AS alumno_id, a.nombre, a.apellido, n.nota1, n.nota2, n.nota3
       FROM alumno a
       LEFT JOIN nota n ON n.alumno_id = a.id AND n.materia_id = ?
       ORDER BY a.apellido, a.nombre`,
      [materiaId]
    );

    const result = rows.map(r => {
      const arr = [r.nota1, r.nota2, r.nota3].filter(v => v !== null);
      const promedio = arr.length ? arr.reduce((a, b) => a + parseFloat(b), 0) / arr.length : null;
      return { alumno_id: r.alumno_id, nombre: r.nombre, apellido: r.apellido, nota1: r.nota1, nota2: r.nota2, nota3: r.nota3, promedio };
    });

    // Promedio general de la materia (sobre alumnos que tienen al menos 1 nota)
    const proms = result.filter(r => r.promedio !== null).map(r => r.promedio);
    const promedio_materia = proms.length ? proms.reduce((a, b) => a + b, 0) / proms.length : null;

    return res.json({ promedio_materia, alumnos: result });
  } catch (err) {
    return res.status(500).json({ mensaje: "Error interno del servidor" });
  }
});

export default router;
