-- WBS management (FR-PRJ-002): owner + milestone flag.
--
-- ADITIF penuh: kolom nullable/ber-DEFAULT. Baris lama tetap valid.

ALTER TABLE "WbsItem" ADD COLUMN "responsibleManager" TEXT;
ALTER TABLE "WbsItem" ADD COLUMN "isMilestone" BOOLEAN NOT NULL DEFAULT false;
