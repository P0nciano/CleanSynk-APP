-- CreateTable
CREATE TABLE "tentativa_admin" (
    "tentativa_id" SERIAL NOT NULL,
    "ip" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tentativa_admin_pkey" PRIMARY KEY ("tentativa_id")
);

-- CreateIndex
CREATE INDEX "tentativa_admin_ip_createdAt_idx" ON "tentativa_admin"("ip", "createdAt");

