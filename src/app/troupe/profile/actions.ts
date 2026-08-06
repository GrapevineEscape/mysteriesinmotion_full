"use server";

import { revalidatePath } from "next/cache";
import { requireTroupe } from "@/lib/auth";
import { db } from "@/lib/db";
import { InvalidPhoneError, normalizeUsPhone } from "@/lib/phone";
import { putR2Object, R2ConfigurationError } from "@/lib/cloudflare-r2";

const HEADSHOT_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_HEADSHOT_BYTES = 5 * 1024 * 1024;

import type { ProfileState } from "./profile-state";

function text(value: FormDataEntryValue | null, limit: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, limit);
  return trimmed || null;
}

async function readHeadshot(file: File | null, userId: string, errors: string[]) {
  if (!file || file.size === 0) return undefined;

  if (!HEADSHOT_TYPES.has(file.type)) {
    errors.push("Headshots must be a PNG, JPEG, or WebP image.");
    return undefined;
  }
  if (file.size > MAX_HEADSHOT_BYTES) {
    errors.push("Headshots must be smaller than 5 MB.");
    return undefined;
  }

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const body = Buffer.from(await file.arrayBuffer());

  try {
    // The timestamp defeats the signed-URL cache when a headshot is replaced.
    return await putR2Object(
      `headshots/${userId}-${Date.now()}.${extension}`,
      body,
      file.type,
    );
  } catch (error) {
    errors.push(
      error instanceof R2ConfigurationError
        ? error.message
        : "The headshot could not be uploaded. Please try again.",
    );
    return undefined;
  }
}

export async function saveProfile(
  _previous: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const member = await requireTroupe();
  const errors: string[] = [];

  let phone: string | null = null;
  const phoneInput = text(formData.get("phone"), 40);
  if (phoneInput) {
    try {
      phone = normalizeUsPhone(phoneInput);
    } catch (error) {
      errors.push(
        error instanceof InvalidPhoneError
          ? error.message
          : "Enter a valid phone number.",
      );
    }
  }

  const headshotFile = formData.get("headshot");
  const headshotUrl = await readHeadshot(
    headshotFile instanceof File ? headshotFile : null,
    member.id,
    errors,
  );

  if (errors.length) return { errors, saved: false };

  await db.user.update({
    where: { id: member.id },
    data: {
      firstName: text(formData.get("firstName"), 100),
      lastName: text(formData.get("lastName"), 100),
      address: text(formData.get("address"), 255),
      bio: text(formData.get("bio"), 2_000),
      phone,
      ...(headshotUrl ? { headshotUrl } : {}),
    },
  });

  revalidatePath("/troupe/profile");
  revalidatePath("/troupe");
  return { errors: [], saved: true };
}
