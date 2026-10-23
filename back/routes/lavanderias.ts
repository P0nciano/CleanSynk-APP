import { Router } from "express";
import { autenticaAdmin } from "../middlewares/autentica";
import { LavanderiaController } from "../controllers/LavanderiaController";

const lavanderiasRoutes = Router();
const lavanderiaController = new LavanderiaController();

lavanderiasRoutes.get("/", lavanderiaController.findAll);
lavanderiasRoutes.get("/geocode", lavanderiaController.geocode);
lavanderiasRoutes.get("/proximas", lavanderiaController.findNearby);
lavanderiasRoutes.get("/cidade", lavanderiaController.cidade);
lavanderiasRoutes.get("/:id", lavanderiaController.findById);
lavanderiasRoutes.post("/", autenticaAdmin, lavanderiaController.create);
lavanderiasRoutes.patch("/:id/precos", autenticaAdmin, lavanderiaController.atualizarPrecos);
lavanderiasRoutes.patch("/:id/foto", autenticaAdmin, lavanderiaController.atualizarFoto);

export { lavanderiasRoutes };
