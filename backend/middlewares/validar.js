import { validationResult } from "express-validator";

// Middleware para validar campos
export const validarCampos = (req, res, next) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({
      ok: false,
      mensaje: "Errores de validación",
      errores: errores.array(),
    });
  }
  next();
};
