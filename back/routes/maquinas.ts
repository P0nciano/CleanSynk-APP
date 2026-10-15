import { Router } from "express";
import { autenticaAdmin } from "../middlewares/autentica";
import { MaquinaController } from "../controllers/MaquinaController";

const maquinasRoutes = Router();
const maquinaController = new MaquinaController();

maquinasRoutes.get("/", maquinaController.findAll);
maquinasRoutes.get("/lavanderia/:lavanderiaId", maquinaController.findByLavanderia);
maquinasRoutes.get("/:id", maquinaController.findById);
maquinasRoutes.post("/", autenticaAdmin, maquinaController.create);
maquinasRoutes.patch("/:id/status", autenticaAdmin, maquinaController.updateStatus);

export { maquinasRoutes };
