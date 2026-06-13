-- DropForeignKey
ALTER TABLE "SavedJob" DROP CONSTRAINT "SavedJob_jdId_fkey";

-- DropForeignKey
ALTER TABLE "SavedJob" DROP CONSTRAINT "SavedJob_userId_fkey";

-- DropTable
DROP TABLE "SavedJob";

