import { Router } from "express";
import { RelatorioController } from "../controllers/RelatorioController";

const relatoriosRoutes = Router();
const relatorioController = new RelatorioController();

relatoriosRoutes.get("/uso-lucro", relatorioController.usoELucro);

export { relatoriosRoutes };
