-- Change embedding dimensions from 1536 (OpenAI) to 768 (Gemini text-embedding-004)
-- Tables are empty so DROP + ADD is safe

ALTER TABLE "ResumeEmbedding" DROP COLUMN "embedding";
ALTER TABLE "ResumeEmbedding" ADD COLUMN "embedding" vector(768) NOT NULL;

ALTER TABLE "IntentEmbedding" DROP COLUMN "embedding";
ALTER TABLE "IntentEmbedding" ADD COLUMN "embedding" vector(768) NOT NULL;

ALTER TABLE "JdEmbedding" DROP COLUMN "embedding";
ALTER TABLE "JdEmbedding" ADD COLUMN "embedding" vector(768) NOT NULL;
