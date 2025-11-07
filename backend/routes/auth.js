import express from "express";
import bcrypt from "bcryptjs";
import { body, validationResult } from "express-validator";
import { db } from "../db.js";

const router = express.Router();

router.post(
  "/register",
  [
    body("nombre").notEmpty().withMessage("El nombre es obligatorio"),
    body("email").isEmail().withMessage("Email invalido"),
    body("password").isLength({ min: 6 }).withMessage("Minimo 6 caracteres"),
  ],
  async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty())
      return res.status(400).json({ errores: errores.array() });

    const { nombre, email, password } = req.body;
    try {
      const [existe] = await db.query("SELECT * FROM usuario WHERE email = ?", [
        email,
      ]);
      if (existe.length > 0)
        return res.status(400).json({ mensaje: "El email ya esta registrado" });

      const hashed = await bcrypt.hash(password, 10);
      await db.query("INSERT INTO usuario (nombre, email, password) VALUES (?,?,?)", [
        nombre,
        email,
        hashed,
      ]);

      res.json({ mensaje: "Usuario registrado correctamente" });
    } catch (err) {
      res.status(500).json({ mensaje: "Error interno del servidor" });
    }
  }
);

export default router;
