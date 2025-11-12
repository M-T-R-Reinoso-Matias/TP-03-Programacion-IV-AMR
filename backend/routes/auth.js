import express from "express";
import bcrypt from "bcryptjs";
import { body, validationResult } from "express-validator";
import { db } from "../db.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// Registrarse
router.post(
  "/register",
  [
    body("nombre").notEmpty().withMessage("El nombre es obligatorio"),
    body("email").isEmail().withMessage("Email inválido"),
    body("password").isLength({ min: 6 }).withMessage("Mínimo 6 caracteres"),
  ],
  async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty())
      return res.status(400).json({
        ok: false,
        mensaje: "Errores de validación",
        errores: errores.array(),
      });

    const { nombre, email, password } = req.body;
    try {
      const [existe] = await db.query("SELECT * FROM usuario WHERE email = ?", [email]);
      if (existe.length > 0)
        return res.status(400).json({ ok: false, mensaje: "El email ya está registrado" });

      const hashed = await bcrypt.hash(password, 10);
      await db.query("INSERT INTO usuario (nombre, email, password) VALUES (?,?,?)", [
        nombre,
        email,
        hashed,
      ]);

      return res.status(201).json({ ok: true, mensaje: "Usuario registrado correctamente" });
    } catch (err) {
      console.error("POST /auth/register:", err);
      return res.status(500).json({ ok: false, mensaje: "Error interno del servidor" });
    }
  }
);

// Logearse
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Email inválido"),
    body("password").notEmpty().withMessage("Contraseña requerida"),
  ],
  async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty())
      return res.status(400).json({
        ok: false,
        mensaje: "Errores de validación",
        errores: errores.array(),
      });

    const { email, password } = req.body;
    try {
      const [rows] = await db.query("SELECT * FROM usuario WHERE email = ?", [email]);
      if (rows.length === 0)
        return res.status(401).json({ ok: false, mensaje: "Credenciales inválidas" });

      const usuario = rows[0];
      const match = await bcrypt.compare(password, usuario.password);
      if (!match)
        return res.status(401).json({ ok: false, mensaje: "Credenciales inválidas" });

      const token = jwt.sign(
        { id: usuario.id, email: usuario.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      // devolver token y usuario dentro de data
      return res.json({
        ok: true,
        mensaje: "Autenticación correcta",
        data: { token, usuario: { id: usuario.id, nombre: usuario.nombre } },
      });
    } catch (err) {
      console.error("POST /auth/login:", err);
      return res.status(500).json({ ok: false, mensaje: "Error interno del servidor" });
    }
  }
);

export default router;
