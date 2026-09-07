/**
 * Shared between the server action and the form that renders its result. Kept
 * out of the action module because a "use server" file may only export
 * functions.
 */
export type OfferResponseState = { message: string | null; ok: boolean };

export const emptyOfferResponseState: OfferResponseState = {
  message: null,
  ok: true,
};
