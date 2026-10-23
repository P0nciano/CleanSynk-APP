import "dotenv/config";
import express from "express";
import cors from "cors";
import { autentica, autenticaAdmin } from "./middlewares/autentica";
import { PagamentoController } from "./controllers/PagamentoController";
import { ReservaController } from "./controllers/ReservaController";
import { LavanderiaController } from "./controllers/LavanderiaController";
import {
  adminLoginRoutes,
  adminsRoutes,
  assistenteAIRoutes,
  lavanderiasRoutes,
  loginRoutes,
  maquinasRoutes,
  notificacaoRoutes,
  pagamentosRoutes,
  precosRoutes,
  relatoriosRoutes,
  reservaRoutes,
  usuariosRoutes,
} from "./routes";

const app = express();

const pagamentoController = new PagamentoController();
const reservaController = new ReservaController();
const lavanderiaController = new LavanderiaController();

app.post(
  "/webhook/stripe",
  express.raw({ type: "application/json" }),
  (req, res) => pagamentoController.webhook(req, res),
);

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Folga para a foto da lavanderia (o app reduz para ~100 KB; o limite da foto é 600 KB)
app.use(express.json({ limit: "1mb" }));

// Serverless (Vercel) não mantém setInterval vivo: as reservas expiradas são liberadas
// na chegada das requisições, no máximo uma vez por minuto por instância
let ultimaLiberacao = 0;
app.use(async (_req, _res, next) => {
  if (Date.now() - ultimaLiberacao > 60 * 1000) {
    ultimaLiberacao = Date.now();
    await reservaController.liberarExpiradas();
  }
  next();
});

app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

app.use("/login", loginRoutes);
app.use("/admin-auth", adminLoginRoutes);
app.use("/usuarios", usuariosRoutes);
app.get("/lavanderias/:id/foto", (req, res) => lavanderiaController.foto(req, res));
app.use("/lavanderias", autentica, lavanderiasRoutes);
app.use("/maquinas", autentica, maquinasRoutes);
app.use("/reservas", autentica, reservaRoutes);
app.use("/precos", autentica, precosRoutes);
app.use("/pagamentos", autentica, pagamentosRoutes);
app.use("/notificacoes", autentica, notificacaoRoutes);
app.use("/admin", autentica, autenticaAdmin, adminsRoutes);
app.use("/relatorios", autentica, autenticaAdmin, relatoriosRoutes);
app.use("/assistente-ia", autentica, autenticaAdmin, assistenteAIRoutes);

export default app;
