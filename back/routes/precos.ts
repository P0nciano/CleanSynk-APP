import { Router } from "express";
import { autenticaAdmin } from "../middlewares/autentica";
import { PrecoController } from "../controllers/PrecoController";

const precosRoutes = Router();
const precoController = new PrecoController();

precosRoutes.post("/", autenticaAdmin, precoController.create);
precosRoutes.get("/maquina/:maquinaId", precoController.findByMaquina);
precosRoutes.patch("/:id", autenticaAdmin, precoController.update);
precosRoutes.delete("/:id", autenticaAdmin, precoController.delete);

export { precosRoutes };
