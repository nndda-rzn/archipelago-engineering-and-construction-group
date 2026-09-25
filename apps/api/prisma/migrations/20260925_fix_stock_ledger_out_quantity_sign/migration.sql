-- Before this migration StockLedgerWriter stored positive quantity for OUT
-- movements despite calculating balanceAfter with a negative delta. Readers
-- aggregate quantity for stock on hand, so fix historical outgoing rows too.
-- The predicate makes this safe for already-signed rows and repeat execution.
-- balanceAfter is an immutable snapshot calculated with the correct sign and
-- must not be recalculated here.
UPDATE "StockLedgerEntry"
SET "quantity" = -"quantity"
WHERE "movementType" IN ('OUT', 'TRANSFER_OUT')
  AND "quantity" > 0;
