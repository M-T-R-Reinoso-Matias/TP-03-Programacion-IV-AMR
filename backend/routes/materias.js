import express from "express";
import { body, param } from "express-validator";
import { validarCampos } from "../middlewares/validar.js";
import { db } from "../db.js";

const router = express.Router();

// Listar todas las materias
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, nombre, codigo, anio FROM materia");
    return res.json({ ok: true, data: rows });
  } catch (err) {
    console.error("GET /materias:", err);
    return res.status(500).json({ ok: false, mensaje: "Error interno del servidor" });
  }
});

// Obtener materia por id
router.get("/:id", [param("id").isInt().withMessage("id inválido")], validarCampos, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, nombre, codigo, anio FROM materia WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ ok: false, mensaje: "Materia no encontrada" });
    return res.json({ ok: true, data: rows[0] });
  } catch (err) {
    console.error("GET /materias/:id:", err);
    return res.status(500).json({ ok: false, mensaje: "Error interno del servidor" });
  }
});

// Crear materia
router.post(
  "/",
  [
    body("nombre").notEmpty().withMessage("Nombre requerido"),
    body("codigo").notEmpty().withMessage("Código requerido"),
    body("anio").isInt({ min: 1900 }).withMessage("Año inválido"),
  ],
  validarCampos,
  async (req, res) => {
    const { nombre, codigo, anio } = req.body;
    try {
      const [exists] = await db.query("SELECT id FROM materia WHERE codigo = ?", [codigo]);
      if (exists.length) return res.status(400).json({ ok: false, mensaje: "Código ya registrado" });

      const [result] = await db.query("INSERT INTO materia (nombre, codigo, anio) VALUES (?,?,?)", [nombre, codigo, anio]);
      return res.status(201).json({ ok: true, mensaje: "Materia creada", data: { id: result.insertId, nombre, codigo, anio } });
    } catch (err) {
      console.error("POST /materias:", err);
      return res.status(500).json({ ok: false, mensaje: "Error interno del servidor" });
    }
  }
);

// Actualizar materia
router.put("/:id",
  [
    param("id").isInt().withMessage("id inválido"),
    body("nombre").optional().notEmpty(),
    body("codigo").optional().notEmpty(),
    body("anio").optional().isInt({ min: 1900 }).withMessage("Año inválido"),
  ],
  validarCampos,
  async (req, res) => {
    const { nombre, codigo, anio } = req.body;
    const id = req.params.id;
    try {
      if (codigo) {
        const [dup] = await db.query("SELECT id FROM materia WHERE codigo = ? AND id <> ?", [codigo, id]);
        if (dup.length) return res.status(400).json({ ok: false, mensaje: "Código ya en uso" });
      }
      await db.query(
        "UPDATE materia SET nombre = COALESCE(?, nombre), codigo = COALESCE(?, codigo), anio = COALESCE(?, anio) WHERE id = ?",
        [nombre, codigo, anio, id]
      );
      return res.json({ ok: true, mensaje: "Materia actualizada" });
    } catch (err) {
      console.error("PUT /materias/:id:", err);
      return res.status(500).json({ ok: false, mensaje: "Error interno del servidor" });
    }
  }
);

// Eliminar materia
router.delete("/:id", [param("id").isInt().withMessage("id inválido")], validarCampos, async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM materia WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ ok: false, mensaje: "Materia no encontrada" });
    return res.json({ ok: true, mensaje: "Materia eliminada" });
  } catch (err) {
    console.error("DELETE /materias/:id:", err);
    return res.status(500).json({ ok: false, mensaje: "Error interno del servidor" });
  }
});

export default router;
