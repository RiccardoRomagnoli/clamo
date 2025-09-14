-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "order_index" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'pending';
