DROP TABLE IF EXISTS "Message";

DROP TABLE IF EXISTS "Chat";

-- CreateTable
CREATE TABLE "Chat" (
    "id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "quality" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "llamaCoderVersion" TEXT NOT NULL DEFAULT 'v2',
    "shadcn" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Message_chatId_idx" ON "Message"("chatId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
