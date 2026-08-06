/**
 * Shared between the server action and the form that renders its result. Kept
 * out of the action module because a "use server" file may only export
 * functions.
 */
export type ProfileState = { errors: string[]; saved: boolean };

export const emptyProfileState: ProfileState = { errors: [], saved: false };
