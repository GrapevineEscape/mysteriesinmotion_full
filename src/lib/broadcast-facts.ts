/**
 * Hire-side facts for The Broadcast. The product is not playable yet;
 * these strings are for marketing and booking enquiries only.
 */

export const BROADCAST_FACTS = {
  name: "The Broadcast",
  season: "Fall 2026",
  guestMax: 300,
  geography: "From anywhere",
  summary:
    "An online mystery we run for your group — up to 300 people, from anywhere.",
} as const;

export const BROADCAST_BOOKING_TITLE = BROADCAST_FACTS.name;
