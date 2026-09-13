import { Router } from "express";
import { PrecoController } from "../controllers/PrecoController";

const precosRoutes = Router();
const precoController = new PrecoController();

precosRoutes.post("/", precoController.create);
precosRoutes.get("/maquina/:maquinaId", precoController.findByMaquina);
precosRoutes.patch("/:id", precoController.update);
precosRoutes.delete("/:id", precoController.delete);

export { precosRoutes };
