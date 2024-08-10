-- CreateTable
CREATE TABLE "GeneratedApp" (
    "id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedApp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GeneratedApp_id_idx" ON "GeneratedApp"("id");
