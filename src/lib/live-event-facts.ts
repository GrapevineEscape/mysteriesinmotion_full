/**
 * Public hire-customer facts for live / escape mysteries.
 * Soft rate language until a firm package sheet is published.
 */

export const LIVE_EVENT_FACTS = {
  runtime: "About 2–2.5 hours",
  guestRange: "Typically 20–100 guests",
  cast: "Full professional cast (size varies by show)",
  space: "Open room or outdoor space where guests can see and mingle",
  leadTime: "Book 3–6 weeks ahead when you can; ask about shorter notice",
  geography: "Dallas–Fort Worth and nearby cities",
  travel:
    "Travel within the DFW metro is included in most private quotes; farther venues may include a travel fee",
  rateBand:
    "Custom quote based on show, cast size, and location — private events typically start in the mid hundreds and scale with cast and travel",
  replyWindow: "two business days",
} as const;

export const HOST_TESTIMONIALS = [
  {
    quote:
      "Our guests were laughing, arguing over clues, and still talking about it the next week. Perfect for our company party.",
    attribution: "Corporate host · Dallas",
  },
  {
    quote:
      "They handled setup, the cast was sharp, and everyone from teens to grandparents got into the mystery.",
    attribution: "Private party · Fort Worth",
  },
  {
    quote:
      "Fundraising night with a twist — interactive, memorable, and easy for us as the organizers.",
    attribution: "Nonprofit event · DFW",
  },
] as const;

export const SHOW_AT_A_GLANCE = [
  { label: "Runtime", value: LIVE_EVENT_FACTS.runtime },
  { label: "Guest count", value: LIVE_EVENT_FACTS.guestRange },
  { label: "Cast", value: LIVE_EVENT_FACTS.cast },
  { label: "Space", value: LIVE_EVENT_FACTS.space },
  { label: "Lead time", value: LIVE_EVENT_FACTS.leadTime },
  { label: "Area", value: LIVE_EVENT_FACTS.geography },
] as const;
