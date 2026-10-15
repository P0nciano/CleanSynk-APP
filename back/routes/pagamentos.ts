import { Router } from "express";
import { autenticaAdmin } from "../middlewares/autentica";
import { PagamentoController } from "../controllers/PagamentoController";

const pagamentosRoutes = Router();
const pagamentoController = new PagamentoController();

pagamentosRoutes.get("/", autenticaAdmin, pagamentoController.findAll);
pagamentosRoutes.get("/reserva/:reservaId", autenticaAdmin, pagamentoController.findByReserva);
pagamentosRoutes.post("/create-intent", pagamentoController.createIntent);
pagamentosRoutes.post("/checkout", pagamentoController.createCheckout);

export { pagamentosRoutes };
