import { Router } from "express";
import { UsuarioController } from "../controllers/UsuarioController";

const usuariosRoutes = Router();
const usuarioController = new UsuarioController();

usuariosRoutes.get("/", usuarioController.findAll);
usuariosRoutes.get("/:id", usuarioController.findById);
usuariosRoutes.post("/", usuarioController.create);
usuariosRoutes.patch("/:id", usuarioController.updateProfile);

export { usuariosRoutes };
