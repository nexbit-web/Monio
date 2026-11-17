-- Цель наставника теперь в долларах в месяц ($100), а не % дохода
ALTER TABLE "User" DROP COLUMN "savingsGoal",
ADD COLUMN "goalUsd" INTEGER NOT NULL DEFAULT 100;
