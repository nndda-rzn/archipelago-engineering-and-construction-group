-- Project card fields: tagline (short headline) + watchlist (needs attention).
-- ADITIF: kolom nullable / ber-DEFAULT.

ALTER TABLE "Project" ADD COLUMN "tagline" TEXT;
ALTER TABLE "Project" ADD COLUMN "isWatchlist" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Project" ADD COLUMN "watchlistReason" TEXT;
