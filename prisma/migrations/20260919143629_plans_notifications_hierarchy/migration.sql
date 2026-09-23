/*
  Warnings:

  - A unique constraint covering the columns `[businessId,parentId,name]` on the table `Category` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED');

-- DropIndex
DROP INDEX "Category_businessId_name_key";

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "adminNotes" TEXT,
ADD COLUMN     "paidUntil" TIMESTAMP(3),
ADD COLUMN     "planId" TEXT,
ADD COLUMN     "requestedAt" TIMESTAMP(3),
ADD COLUMN     "requestedPlanId" TEXT,
ADD COLUMN     "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "parentId" TEXT;

-- CreateTable
CREATE TABLE "PlatformAdmin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "trialDurationDays" INTEGER NOT NULL DEFAULT 30,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceLabel" TEXT NOT NULL,
    "description" TEXT,
    "maxCustomers" INTEGER,
    "maxInvoicesPerMonth" INTEGER,
    "maxConcurrentLogins" INTEGER,
    "canExportPdf" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "ctaLabel" TEXT NOT NULL DEFAULT 'View plans',
    "ctaHref" TEXT NOT NULL DEFAULT '/plans',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxViewsPerBusiness" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationView" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),

    CONSTRAINT "NotificationView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAdmin_email_key" ON "PlatformAdmin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_name_key" ON "Plan"("name");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationView_notificationId_businessId_key" ON "NotificationView"("notificationId", "businessId");

-- CreateIndex
CREATE INDEX "UserSession_businessId_revokedAt_expiresAt_idx" ON "UserSession"("businessId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "Category_businessId_parentId_idx" ON "Category"("businessId", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_businessId_parentId_name_key" ON "Category"("businessId", "parentId", "name");

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_requestedPlanId_fkey" FOREIGN KEY ("requestedPlanId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationView" ADD CONSTRAINT "NotificationView_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationView" ADD CONSTRAINT "NotificationView_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
