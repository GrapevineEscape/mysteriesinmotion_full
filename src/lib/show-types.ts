import type { ShowType } from "@prisma/client";

export const SHOW_TYPE_LABELS: Record<ShowType, string> = {
  STANDARD: "Standard",
  ESCAPE: "Escape",
  ONLINE: "Online",
};

/** Show types performed live by the troupe, as opposed to played at home. */
export const LIVE_SHOW_TYPES: ShowType[] = ["STANDARD", "ESCAPE"];

export function isShowType(value: string | null | undefined): value is ShowType {
  return value === "STANDARD" || value === "ESCAPE" || value === "ONLINE";
}
