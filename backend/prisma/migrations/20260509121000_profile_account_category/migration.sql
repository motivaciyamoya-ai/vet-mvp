-- CreateEnum
CREATE TYPE "AccountCategory" AS ENUM ('SPECIALIST', 'BUSINESS_OWNER', 'ADMINISTRATOR');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "accountCategory" "AccountCategory" NOT NULL DEFAULT 'SPECIALIST';

