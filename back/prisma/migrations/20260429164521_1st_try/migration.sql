-- CreateEnum
CREATE TYPE "TipoUsuario" AS ENUM ('USER', 'PROPRIETARIO', 'ADMIN');

-- CreateTable
CREATE TABLE "usuario" (
    "usuario_id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "tipo" "TipoUsuario" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("usuario_id")
);

-- CreateTable
CREATE TABLE "lavanderia" (
    "lavanderia_id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "proprietario_id" INTEGER NOT NULL,

    CONSTRAINT "lavanderia_pkey" PRIMARY KEY ("lavanderia_id")
);

-- CreateTable
CREATE TABLE "maquina" (
    "maquina_id" SERIAL NOT NULL,
    "lavanderia_id" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "maquina_pkey" PRIMARY KEY ("maquina_id")
);

-- CreateTable
CREATE TABLE "reserva" (
    "reserva_id" SERIAL NOT NULL,
    "maquina_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "data_inicio" TIMESTAMP(3) NOT NULL,
    "data_fim" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "reserva_pkey" PRIMARY KEY ("reserva_id")
);

-- CreateTable
CREATE TABLE "notificacao" (
    "notificacao_id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacao_pkey" PRIMARY KEY ("notificacao_id")
);

-- CreateTable
CREATE TABLE "preco" (
    "preco_id" SERIAL NOT NULL,
    "maquina_id" INTEGER NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "duracao_minutos" INTEGER NOT NULL,

    CONSTRAINT "preco_pkey" PRIMARY KEY ("preco_id")
);

-- CreateTable
CREATE TABLE "pagamento" (
    "pagamento_id" SERIAL NOT NULL,
    "reserva_id" INTEGER NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL,
    "metodo" TEXT NOT NULL,
    "data_pagamento" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagamento_pkey" PRIMARY KEY ("pagamento_id")
);

-- CreateTable
CREATE TABLE "log" (
    "log_id" SERIAL NOT NULL,
    "admin_id" INTEGER NOT NULL,
    "acao" TEXT NOT NULL,
    "tabela_afetada" TEXT NOT NULL,
    "registro_afetado" INTEGER NOT NULL,
    "data_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_pkey" PRIMARY KEY ("log_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- AddForeignKey
ALTER TABLE "lavanderia" ADD CONSTRAINT "lavanderia_proprietario_id_fkey" FOREIGN KEY ("proprietario_id") REFERENCES "usuario"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maquina" ADD CONSTRAINT "maquina_lavanderia_id_fkey" FOREIGN KEY ("lavanderia_id") REFERENCES "lavanderia"("lavanderia_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva" ADD CONSTRAINT "reserva_maquina_id_fkey" FOREIGN KEY ("maquina_id") REFERENCES "maquina"("maquina_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva" ADD CONSTRAINT "reserva_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacao" ADD CONSTRAINT "notificacao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preco" ADD CONSTRAINT "preco_maquina_id_fkey" FOREIGN KEY ("maquina_id") REFERENCES "maquina"("maquina_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamento" ADD CONSTRAINT "pagamento_reserva_id_fkey" FOREIGN KEY ("reserva_id") REFERENCES "reserva"("reserva_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log" ADD CONSTRAINT "log_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "usuario"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;
