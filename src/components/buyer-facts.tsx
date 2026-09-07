import { LIVE_EVENT_FACTS, SHOW_AT_A_GLANCE } from "@/lib/live-event-facts";

export function BuyerFactsStrip({
  compact = false,
}: {
  compact?: boolean;
}) {
  const items = compact
    ? SHOW_AT_A_GLANCE.filter((item) =>
        ["Runtime", "Guest count", "Area"].includes(item.label),
      )
    : SHOW_AT_A_GLANCE;

  return (
    <div className="buyer-facts">
      <ul className="buyer-facts-list" aria-label="Event logistics">
        {items.map((item) => (
          <li key={item.label}>
            <strong>{item.label}</strong>
            <span>{item.value}</span>
          </li>
        ))}
      </ul>
      <p className="buyer-facts-rate">
        <strong>Rates:</strong> {LIVE_EVENT_FACTS.rateBand}.{" "}
        {LIVE_EVENT_FACTS.travel}.
      </p>
    </div>
  );
}
