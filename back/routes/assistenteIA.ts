import { Router } from "express";
import { AssistenteIAController } from "../controllers/AssistenteIAController";

const assistenteAIRoutes = Router();
const assistenteIAController = new AssistenteIAController();

assistenteAIRoutes.post("/analisar", assistenteIAController.analisarOcorrencias);
assistenteAIRoutes.get("/analisar", assistenteIAController.analisarOcorrenciasBanco.bind(assistenteIAController));

export { assistenteAIRoutes };