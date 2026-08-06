const STEPS = [
  { key: "booking", label: "Booking" },
  { key: "cast", label: "Cast" },
  { key: "rehearsals", label: "Rehearsals" },
  { key: "publish", label: "Publish" },
] as const;

export type WizardStep = (typeof STEPS)[number]["key"];

export function WizardSteps({ current }: { current: WizardStep }) {
  const currentIndex = STEPS.findIndex((step) => step.key === current);

  return (
    <ol className="admin-wizard-steps">
      {STEPS.map((step, index) => (
        <li
          data-state={
            index === currentIndex
              ? "current"
              : index < currentIndex
                ? "done"
                : "upcoming"
          }
          key={step.key}
        >
          <span className="admin-wizard-step-number">{index + 1}</span>
          <span>{step.label}</span>
        </li>
      ))}
    </ol>
  );
}
