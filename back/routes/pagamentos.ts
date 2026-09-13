import { Router } from "express";
import { PagamentoController } from "../controllers/PagamentoController";

const pagamentosRoutes = Router();
const pagamentoController = new PagamentoController();

pagamentosRoutes.get("/", pagamentoController.findAll);
pagamentosRoutes.get("/reserva/:reservaId", pagamentoController.findByReserva);
pagamentosRoutes.post("/", pagamentoController.create);
pagamentosRoutes.post("/create-intent", pagamentoController.createIntent);

export { pagamentosRoutes };
