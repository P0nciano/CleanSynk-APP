// src/routes/reserva.routes.ts

import { Router } from "express";
import { ReservaController } from "../controllers/ReservaController";

const reservaRoutes = Router();

const reservaController = new ReservaController();

reservaRoutes.get("/", reservaController.findAll);
reservaRoutes.get("/usuario/:usuarioId", reservaController.findByUsuario);
reservaRoutes.get("/:id", reservaController.findById);

reservaRoutes.post("/", reservaController.create);

reservaRoutes.patch("/:id/status", reservaController.updateStatus);

reservaRoutes.delete("/:id", reservaController.delete);

export { reservaRoutes };