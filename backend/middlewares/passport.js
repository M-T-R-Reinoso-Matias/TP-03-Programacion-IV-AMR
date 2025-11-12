import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import passport from "passport";
import dotenv from "dotenv";
import { db } from "../db.js";

dotenv.config();

// Configuración de la estrategia JWT
const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
};

// Definir la estrategia JWT
passport.use(
  new JwtStrategy(opts, async (jwt_payload, done) => {
   const [rows] = await db.query("SELECT id, nombre, email FROM usuario WHERE id = ?", [jwt_payload.id]);
    if (rows.length === 0) return done(null, false);
    return done(null, rows[0]);
  })
);

export default passport;
