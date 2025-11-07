import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import passport from "passport";
import dotenv from "dotenv";
import { db } from "../db.js";

dotenv.config();

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
};

passport.use(
  new JwtStrategy(opts, async (jwt_payload, done) => {
    const [rows] = await db.query("SELECT * FROM usuario WHERE id = ?", [
      jwt_payload.id,
    ]);
    if (rows.length === 0) return done(null, false);
    return done(null, rows[0]);
  })
);

export default passport;
