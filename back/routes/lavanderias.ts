import { Router } from "express";
import { LavanderiaController } from "../controllers/LavanderiaController";

const lavanderiasRoutes = Router();
const lavanderiaController = new LavanderiaController();

lavanderiasRoutes.get("/", lavanderiaController.findAll);
lavanderiasRoutes.get("/geocode", lavanderiaController.geocode);
lavanderiasRoutes.get("/proximas", lavanderiaController.findNearby);
lavanderiasRoutes.get("/:id", lavanderiaController.findById);
lavanderiasRoutes.post("/", lavanderiaController.create);

export { lavanderiasRoutes };
