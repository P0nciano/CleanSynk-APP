import { Router } from "express";
import { autenticaAdmin } from "../middlewares/autentica";
import { NotificacaoController } from "../controllers/NotificacaoController";

const notificacaoRoutes = Router();
const notificacaoController = new NotificacaoController();

notificacaoRoutes.get("/usuario/:usuarioId", notificacaoController.findByUsuario);
notificacaoRoutes.get("/", autenticaAdmin, notificacaoController.findAll);
notificacaoRoutes.get("/:id", notificacaoController.findById);
notificacaoRoutes.post("/", autenticaAdmin, notificacaoController.create);
notificacaoRoutes.patch("/:id/lida", notificacaoController.markAsRead);
notificacaoRoutes.delete("/:id", notificacaoController.delete);

export { notificacaoRoutes };