// src/routes/reserva.routes.ts

import { Router } from "express";
import { autenticaAdmin } from "../middlewares/autentica";
import { ReservaController } from "../controllers/ReservaController";

const reservaRoutes = Router();

const reservaController = new ReservaController();

reservaRoutes.get("/", autenticaAdmin, reservaController.findAll);
reservaRoutes.get("/usuario/:usuarioId", reservaController.findByUsuario);
reservaRoutes.get("/:id", reservaController.findById);

reservaRoutes.post("/", reservaController.create);

reservaRoutes.post("/:id/cancelar", reservaController.cancelar);

reservaRoutes.patch("/:id/status", autenticaAdmin, reservaController.updateStatus);

reservaRoutes.delete("/:id", reservaController.delete);

export { reservaRoutes };