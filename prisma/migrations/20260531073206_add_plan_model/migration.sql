-- CreateTable: Plan (mapped to "plans" via @@map)
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "features" JSONB NOT NULL DEFAULT '{}',
    "price_monthly" DECIMAL(65,30),
    "price_yearly" DECIMAL(65,30),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- Seed default plans
INSERT INTO "plans" ("id", "name", "description", "features", "sort_order", "is_active", "created_at", "updated_at")
VALUES
  ('free', 'Free', 'Free plan with basic features', '{"max_projects":5,"storage_gb":1,"supports_ai":false}', 0, true, NOW(), NOW()),
  ('pro', 'Pro', 'Pro plan with advanced features', '{"max_projects":50,"storage_gb":50,"supports_ai":true}', 1, true, NOW(), NOW());

-- AlterTable: Add new columns to UserProfile (existing table name from init migration)
ALTER TABLE "UserProfile" 
  ADD COLUMN "plan_id" TEXT,
  ADD COLUMN "subscription_status" TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN "subscription_ends_at" TIMESTAMP(3);

-- Backfill plan_id from existing plan column
UPDATE "UserProfile"
SET "plan_id" = CASE
  WHEN LOWER("plan") = 'pro' THEN 'pro'
  ELSE 'free'
END;

-- Make plan_id NOT NULL after backfill
ALTER TABLE "UserProfile" ALTER COLUMN "plan_id" SET NOT NULL;

-- Drop the old plan column
ALTER TABLE "UserProfile" DROP COLUMN "plan";

-- CreateIndex
CREATE INDEX "UserProfile_plan_id_idx" ON "UserProfile"("plan_id");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
