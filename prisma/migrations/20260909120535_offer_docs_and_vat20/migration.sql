-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "offerAmount" DOUBLE PRECISION,
ADD COLUMN     "offerDocumentFilename" TEXT,
ADD COLUMN     "offerDocumentPath" TEXT,
ADD COLUMN     "offerDocumentUploadedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Settings" ALTER COLUMN "vatRate" SET DEFAULT 20;
