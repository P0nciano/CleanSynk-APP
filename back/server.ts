import "dotenv/config";
import express from "express";
import cors from "cors";
import { autentica, autenticaAdmin } from "./middlewares/autentica";
import { PagamentoController } from "./controllers/PagamentoController";
import { ReservaController } from "./controllers/ReservaController";
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
const port = Number(process.env.PORT) || 3000;

const pagamentoController = new PagamentoController();
const reservaController = new ReservaController();

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

app.use(express.json());

app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

app.use("/login", loginRoutes);
app.use("/admin-auth", adminLoginRoutes);
app.use("/usuarios", usuariosRoutes);
app.use("/lavanderias", autentica, lavanderiasRoutes);
app.use("/maquinas", autentica, maquinasRoutes);
app.use("/reservas", autentica, reservaRoutes);
app.use("/precos", autentica, precosRoutes);
app.use("/pagamentos", autentica, pagamentosRoutes);
app.use("/notificacoes", autentica, notificacaoRoutes);
app.use("/admin", autentica, autenticaAdmin, adminsRoutes);
app.use("/relatorios", autentica, autenticaAdmin, relatoriosRoutes);
app.use("/assistente-ia", autentica, autenticaAdmin, assistenteAIRoutes);

// Job: verifica reservas expiradas a cada 1 minuto
setInterval(() => {
  reservaController.liberarExpiradas();
}, 60 * 1000);

// Roda uma vez ao iniciar também
reservaController.liberarExpiradas();

app.listen(port, () => {
  console.log(`API rodando na porta ${port}`);
  console.log(`[JOB] Verificação de reservas expiradas ativa (a cada 1 min)`);
});
