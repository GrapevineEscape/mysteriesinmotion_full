export type WizardState = {
  errors: string[];
  saved?: boolean;
};

export const emptyWizardState: WizardState = { errors: [] };
