import { Router } from "express";
import { autentica, autenticaAdmin } from "../middlewares/autentica";
import { UsuarioController } from "../controllers/UsuarioController";

const usuariosRoutes = Router();
const usuarioController = new UsuarioController();

usuariosRoutes.get("/", autentica, autenticaAdmin, usuarioController.findAll);
usuariosRoutes.get("/:id", autentica, usuarioController.findById);
usuariosRoutes.post("/", usuarioController.create);
usuariosRoutes.patch("/:id", autentica, usuarioController.updateProfile);

export { usuariosRoutes };
