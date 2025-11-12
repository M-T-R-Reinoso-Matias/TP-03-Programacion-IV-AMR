import express from "express";
import { body, param } from "express-validator";
import { validarCampos } from "../middlewares/validar.js";
import { db } from "../db.js";

const router = express.Router();

// Listar todos
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, nombre, apellido, dni FROM alumno");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ mensaje: "Error interno" });
  }
});

// Obtener por id
router.get("/:id", [param("id").isInt().withMessage("id invalido")], validarCampos, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, nombre, apellido, dni FROM alumno WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ mensaje: "Alumno no encontrado" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ mensaje: "Error interno" });
  }
});

// Crear
router.post(
  "/",
  [
    body("nombre").notEmpty().withMessage("Nombre requerido"),
    body("apellido").notEmpty().withMessage("Apellido requerido"),
    body("dni").notEmpty().withMessage("DNI requerido").isNumeric().withMessage("DNI numérico"),
  ],
  validarCampos,
  async (req, res) => {
    const { nombre, apellido, dni } = req.body;
    try {
      const [existe] = await db.query("SELECT id FROM alumno WHERE dni = ?", [dni]);
      if (existe.length) return res.status(400).json({ mensaje: "DNI ya registrado" });

      const [result] = await db.query("INSERT INTO alumno (nombre, apellido, dni) VALUES (?,?,?)", [nombre, apellido, dni]);
      res.status(201).json({ id: result.insertId, nombre, apellido, dni });
    } catch (err) {
      res.status(500).json({ mensaje: "Error interno" });
    }
  }
);

// Actualizar
router.put(
  "/:id",
  [
    param("id").isInt().withMessage("id invalido"),
    body("nombre").optional().notEmpty(),
    body("apellido").optional().notEmpty(),
    body("dni").optional().isNumeric().withMessage("DNI numérico"),
  ],
  validarCampos,
  async (req, res) => {
    const { nombre, apellido, dni } = req.body;
    const id = req.params.id;
    try {
      if (dni) {
        const [dup] = await db.query("SELECT id FROM alumno WHERE dni = ? AND id <> ?", [dni, id]);
        if (dup.length) return res.status(400).json({ mensaje: "DNI ya en uso por otro alumno" });
      }
      await db.query(
        "UPDATE alumno SET nombre = COALESCE(?, nombre), apellido = COALESCE(?, apellido), dni = COALESCE(?, dni) WHERE id = ?",
        [nombre, apellido, dni, id]
      );
      res.json({ mensaje: "Alumno actualizado" });
    } catch (err) {
      res.status(500).json({ mensaje: "Error interno del servidor" });
    }
  }
);

// Eliminar
router.delete("/:id", [param("id").isInt().withMessage("id invalido")], validarCampos, async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM alumno WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ mensaje: "Alumno no encontrado" });
    res.json({ mensaje: "Alumno eliminado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
});


export default router;
