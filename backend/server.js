import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import alumnosRoutes from "./routes/alumnos.js";
import materiasRoutes from "./routes/materias.js";
import notasRoutes from "./routes/notas.js";
import passport from "./middlewares/passport.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(passport.initialize());
app.use("/api/auth",     authRoutes);
app.use("/api/alumnos",  passport.authenticate("jwt", { session: false }), alumnosRoutes);
app.use("/api/materias", passport.authenticate("jwt", { session: false }), materiasRoutes);
app.use("/api/notas",    passport.authenticate("jwt", { session: false }), notasRoutes);

app.get("/", (req, res) => {
  res.json({ mensaje: "Servidor Express Gestion de notas funcionando" });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Servidor iniciado en puerto ${PORT}`));
