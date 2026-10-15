// Execução local (npm run dev). Na Vercel, quem usa o app é api/index.mjs
import app from "./app";

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`API rodando na porta ${port}`);
});
