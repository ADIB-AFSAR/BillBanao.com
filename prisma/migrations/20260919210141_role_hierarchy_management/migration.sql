-- AlterTable
ALTER TABLE "User" ADD COLUMN     "canManageCategories" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canManageCustomers" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canManageProducts" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canViewAnalytics" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canViewInvoiceHistory" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;
