import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import passport from "./middleware/passport.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use(passport.initialize());

app.get("/", (req, res) => {
  res.json({ mensaje: "Servidor Express funcionando" });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Servidor iniciado en puerto ${PORT}`));
