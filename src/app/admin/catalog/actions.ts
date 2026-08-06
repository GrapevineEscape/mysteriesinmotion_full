"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ShowStatus, ShowType } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { putR2Object, R2ConfigurationError } from "@/lib/cloudflare-r2";
import { isShowType } from "@/lib/show-types";
import { uniqueSlug } from "@/lib/slug";
import type { CatalogState } from "./catalog-state";

const MAX_SCRIPT_BYTES = 25 * 1024 * 1024;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function text(value: FormDataEntryValue | null, limit: number) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function showStatus(value: FormDataEntryValue | null): ShowStatus {
  return value === "PUBLISHED" || value === "ARCHIVED" ? value : "DRAFT";
}

async function upload(
  file: File | null,
  prefix: string,
  allowedTypes: string[],
  maxBytes: number,
  errors: string[],
) {
  if (!file || file.size === 0) return undefined;

  if (!allowedTypes.includes(file.type)) {
    errors.push(`${prefix} must be one of: ${allowedTypes.join(", ")}.`);
    return undefined;
  }
  if (file.size > maxBytes) {
    errors.push(
      `${prefix} must be smaller than ${Math.round(maxBytes / (1024 * 1024))} MB.`,
    );
    return undefined;
  }

  const safeName = file.name.replace(/[^A-Za-z0-9._-]+/g, "-");
  try {
    return await putR2Object(
      `${prefix}/${Date.now()}-${safeName}`,
      Buffer.from(await file.arrayBuffer()),
      file.type,
    );
  } catch (error) {
    errors.push(
      error instanceof R2ConfigurationError
        ? error.message
        : `${prefix} could not be uploaded.`,
    );
    return undefined;
  }
}

function readShowFields(formData: FormData, errors: string[]) {
  const title = text(formData.get("title"), 200);
  const shortDescription = text(formData.get("shortDescription"), 500);
  const fullDescription = text(formData.get("fullDescription"), 5_000);
  const typeInput = formData.get("type");

  if (!title) errors.push("A title is required.");
  if (!shortDescription) errors.push("A short description is required.");
  if (!isShowType(typeof typeInput === "string" ? typeInput : null)) {
    errors.push("Choose a show type.");
  }

  return {
    title,
    shortDescription,
    // The long description is what the show detail page leads with, so it
    // falls back to the short one rather than rendering an empty section.
    fullDescription: fullDescription || shortDescription,
    type: (typeInput as ShowType) ?? "STANDARD",
    kidFriendly: Boolean(formData.get("kidFriendly")),
    status: showStatus(formData.get("status")),
    difficulty: text(formData.get("difficulty"), 60) || null,
    ageRecommendation: text(formData.get("ageRecommendation"), 60) || null,
    contentAdvisory: text(formData.get("contentAdvisory"), 500) || null,
  };
}

export async function createShow(
  _previous: CatalogState,
  formData: FormData,
): Promise<CatalogState> {
  await requireAdmin();
  const errors: string[] = [];
  const fields = readShowFields(formData, errors);
  if (errors.length) return { errors, saved: false };

  const existing = await db.show.findMany({ select: { slug: true } });
  const slug = uniqueSlug(fields.title, existing.map((show) => show.slug));

  await db.show.create({ data: { ...fields, slug } });

  revalidatePath("/admin/catalog");
  redirect(`/admin/catalog/${slug}`);
}

export async function updateShow(
  _previous: CatalogState,
  formData: FormData,
): Promise<CatalogState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const errors: string[] = [];
  const fields = readShowFields(formData, errors);

  const scriptFile = formData.get("script");
  const imageFile = formData.get("coverImage");
  const [scriptUrl, coverImageUrl] = [
    await upload(
      scriptFile instanceof File ? scriptFile : null,
      "scripts",
      ["application/pdf"],
      MAX_SCRIPT_BYTES,
      errors,
    ),
    await upload(
      imageFile instanceof File ? imageFile : null,
      "show-images",
      ["image/png", "image/jpeg", "image/webp"],
      MAX_IMAGE_BYTES,
      errors,
    ),
  ];

  if (errors.length) return { errors, saved: false };

  await db.show.update({
    where: { id },
    data: {
      ...fields,
      ...(scriptUrl ? { scriptUrl } : {}),
      ...(coverImageUrl ? { coverImageUrl } : {}),
    },
  });

  const show = await db.show.findUniqueOrThrow({
    where: { id },
    select: { slug: true },
  });
  revalidatePath("/admin/catalog");
  revalidatePath(`/admin/catalog/${show.slug}`);
  return { errors: [], saved: true };
}

export async function deleteShow(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");

  // Bookings restrict deletion on purpose: a customer enquiry must not vanish
  // because the show it referred to was tidied away.
  const bookings = await db.booking.count({ where: { showId: id } });
  if (bookings > 0) {
    redirect(`/admin/catalog?error=${encodeURIComponent("bookings-exist")}`);
  }

  await db.show.delete({ where: { id } });
  revalidatePath("/admin/catalog");
  redirect("/admin/catalog");
}

export async function saveRole(formData: FormData) {
  await requireAdmin();
  const showId = String(formData.get("showId") ?? "");
  const roleId = String(formData.get("roleId") ?? "");

  const show = await db.show.findUnique({
    where: { id: showId },
    select: { slug: true },
  });
  if (!show) redirect("/admin/catalog");

  const data = {
    name: text(formData.get("name"), 100),
    gender: text(formData.get("gender"), 40) || "Any",
    age: text(formData.get("age"), 40) || "Any",
    description: text(formData.get("description"), 2_000),
    displayOrder: Number(formData.get("displayOrder") ?? 0) || 0,
  };
  if (!data.name) redirect(`/admin/catalog/${show.slug}`);

  if (roleId) {
    await db.role.update({ where: { id: roleId }, data });
  } else {
    await db.role.create({ data: { ...data, showId } });
  }

  revalidatePath(`/admin/catalog/${show.slug}`);
  redirect(`/admin/catalog/${show.slug}`);
}

export async function deleteRole(formData: FormData) {
  await requireAdmin();
  const roleId = String(formData.get("roleId") ?? "");

  const role = await db.role.findUnique({
    where: { id: roleId },
    include: { show: { select: { slug: true } } },
  });
  if (!role) redirect("/admin/catalog");

  await db.role.delete({ where: { id: roleId } });
  revalidatePath(`/admin/catalog/${role.show.slug}`);
  redirect(`/admin/catalog/${role.show.slug}`);
}
