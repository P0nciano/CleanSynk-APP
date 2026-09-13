import { Router } from "express";
import { MaquinaController } from "../controllers/MaquinaController";

const maquinasRoutes = Router();
const maquinaController = new MaquinaController();

maquinasRoutes.get("/", maquinaController.findAll);
maquinasRoutes.get("/lavanderia/:lavanderiaId", maquinaController.findByLavanderia);
maquinasRoutes.get("/:id", maquinaController.findById);
maquinasRoutes.post("/", maquinaController.create);
maquinasRoutes.patch("/:id/status", maquinaController.updateStatus);

export { maquinasRoutes };
