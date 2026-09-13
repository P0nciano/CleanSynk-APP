-- CreateTable
CREATE TABLE "ocorrencia" (
    "ocorrencia_id" SERIAL NOT NULL,
    "lavanderia_id" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "impacto" TEXT NOT NULL,
    "setor" TEXT NOT NULL,
    "tempoParadoHoras" DOUBLE PRECISION NOT NULL,
    "envolveCliente" BOOLEAN NOT NULL,
    "qtdAfetados" INTEGER NOT NULL,
    "nivelCriticidade" TEXT,
    "recomendacaoIA" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ocorrencia_pkey" PRIMARY KEY ("ocorrencia_id")
);

-- CreateTable
CREATE TABLE "analise_ia" (
    "analise_id" SERIAL NOT NULL,
    "ocorrencia_id" INTEGER NOT NULL,
    "nivelCriticidade" TEXT NOT NULL,
    "prioridade" INTEGER NOT NULL,
    "recomendacao" TEXT NOT NULL,
    "justificativa" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analise_ia_pkey" PRIMARY KEY ("analise_id")
);

-- AddForeignKey
ALTER TABLE "ocorrencia" ADD CONSTRAINT "ocorrencia_lavanderia_id_fkey" FOREIGN KEY ("lavanderia_id") REFERENCES "lavanderia"("lavanderia_id") ON DELETE RESTRICT ON UPDATE CASCADE;
