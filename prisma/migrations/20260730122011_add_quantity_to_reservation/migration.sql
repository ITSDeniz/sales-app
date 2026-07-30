/*
  Warnings:

  - Added the required column `quantity` to the `Reservation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "quantity" INTEGER NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL;
