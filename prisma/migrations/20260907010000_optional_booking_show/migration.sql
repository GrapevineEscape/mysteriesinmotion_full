-- Broadcast enquiries are hire requests with no live catalog title attached.
ALTER TABLE "Booking" ALTER COLUMN "showId" DROP NOT NULL;
