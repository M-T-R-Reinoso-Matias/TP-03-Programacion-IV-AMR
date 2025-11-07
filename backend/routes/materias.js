import express from "express";
import { body, param } from "express-validator";
import { validarCampos } from "../middlewares/validar.js";
import { db } from "../db.js";

const router = express.Router();

// Listar
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, nombre, codigo, anio FROM materia");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
});

// Obtener por id
router.get("/:id", [param("id").isInt()], validarCampos, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, nombre, codigo, anio FROM materia WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ mensaje: "Materia no encontrada" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
});

// Crear
router.post(
  "/",
  [
    body("nombre").notEmpty(),
    body("codigo").notEmpty(),
    body("anio").isInt({ min: 1900 }).withMessage("Año invalido"),
  ],
  validarCampos,
  async (req, res) => {
    const { nombre, codigo, anio } = req.body;
    try {
      const [exists] = await db.query("SELECT id FROM materia WHERE codigo = ?", [codigo]);
      if (exists.length) return res.status(400).json({ mensaje: "Codigo ya registrado" });

      const [result] = await db.query("INSERT INTO materia (nombre, codigo, anio) VALUES (?,?,?)", [nombre, codigo, anio]);
      res.status(201).json({ id: result.insertId, nombre, codigo, anio });
    } catch (err) {
      res.status(500).json({ mensaje: "Error interno del servidor" });
    }
  }
);

// Actualizar
router.put("/:id",
  [
    param("id").isInt(),
    body("nombre").optional().notEmpty(),
    body("codigo").optional().notEmpty(),
    body("anio").optional().isInt({ min: 1900 })
  ],
  validarCampos,
  async (req, res) => {
    const { nombre, codigo, anio } = req.body;
    const id = req.params.id;
    try {
      if (codigo) {
        const [dup] = await db.query("SELECT id FROM materia WHERE codigo = ? AND id <> ?", [codigo, id]);
        if (dup.length) return res.status(400).json({ mensaje: "Codigo ya en uso" });
      }
      await db.query(
        "UPDATE materia SET nombre = COALESCE(?, nombre), codigo = COALESCE(?, codigo), anio = COALESCE(?, anio) WHERE id = ?",
        [nombre, codigo, anio, id]
      );
      res.json({ mensaje: "Materia actualizada" });
    } catch (err) {
      res.status(500).json({ mensaje: "Error interno del servidor" });
    }
  }
);

// Eliminar
router.delete("/:id", [param("id").isInt()], validarCampos, async (req, res) => {
  try {
    await db.query("DELETE FROM materia WHERE id = ?", [req.params.id]);
    res.json({ mensaje: "Materia eliminada" });
  } catch (err) {
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
});

export default router;
