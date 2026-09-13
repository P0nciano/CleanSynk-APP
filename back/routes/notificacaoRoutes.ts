import { Router } from "express";
import { NotificacaoController } from "../controllers/NotificacaoController";

const notificacaoRoutes = Router();
const notificacaoController = new NotificacaoController();

notificacaoRoutes.get("/usuario/:usuarioId", notificacaoController.findByUsuario);
notificacaoRoutes.get("/", notificacaoController.findAll);
notificacaoRoutes.get("/:id", notificacaoController.findById);
notificacaoRoutes.post("/", notificacaoController.create);
notificacaoRoutes.patch("/:id/lida", notificacaoController.markAsRead);
notificacaoRoutes.delete("/:id", notificacaoController.delete);

export { notificacaoRoutes };