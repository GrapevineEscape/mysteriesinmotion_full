/**
 * Shared between the server action and the form that renders its result. Kept
 * out of the action module because a "use server" file may only export
 * functions: an object exported from one arrives in the client as a server
 * reference, not the value.
 */
export type BookingFormState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors: Record<string, string>;
};

export const emptyBookingState: BookingFormState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};
