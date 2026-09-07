"use client";

import { useState } from "react";
import type { ImageSlotSpec } from "@/lib/customer-images";

type ImageSlotProps = {
  spec: Pick<ImageSlotSpec, "width" | "height" | "label" | "description">;
  /** Already-resolved public URLs to try (DB cover, local drop folder, etc.) */
  candidates?: Array<string | null | undefined>;
  className?: string;
  /** Fill parent width; height follows aspect ratio from spec (crop with object-fit) */
  fill?: boolean;
  alt?: string;
};

/**
 * Media frame with a target aspect ratio. Any source size works — we crop with
 * object-fit: cover. Shows a labeled placeholder until a candidate loads.
 */
export function ImageSlot({
  spec,
  candidates = [],
  className = "",
  fill = false,
  alt,
}: ImageSlotProps) {
  const sources = candidates.filter(
    (value): value is string => Boolean(value && value.trim()),
  );
  const [index, setIndex] = useState(0);
  const [failedAll, setFailedAll] = useState(sources.length === 0);

  const src = !failedAll ? sources[index] : null;
  const altText = alt ?? spec.description;

  // Use real-ish intrinsic pixels so the browser reserves space (aspect ratios
  // like 4×3 would otherwise reserve a 4px×3px box before CSS applies).
  const intrinsicW = Math.max(spec.width, 1) * 240;
  const intrinsicH = Math.max(spec.height, 1) * 240;

  const style = fill
    ? {
        width: "100%",
        aspectRatio: `${spec.width} / ${spec.height}`,
      }
    : {
        width: "100%",
        maxWidth: intrinsicW,
        aspectRatio: `${spec.width} / ${spec.height}`,
      };

  if (!src) {
    return (
      <div
        className={`image-slot image-slot-empty ${className}`.trim()}
        style={style}
        role="img"
        aria-label={`Placeholder: ${spec.label}. ${spec.description}`}
      >
        <span className="image-slot-label">{spec.label}</span>
        <span className="image-slot-size">Photo coming soon</span>
        <span className="image-slot-hint">
          Drop into public/images/customer/
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- local drop-folder assets; onError fallback
    <img
      className={`image-slot image-slot-photo ${className}`.trim()}
      src={src}
      alt={altText}
      width={intrinsicW}
      height={intrinsicH}
      style={style}
      onError={() => {
        if (index + 1 < sources.length) {
          setIndex((current) => current + 1);
        } else {
          setFailedAll(true);
        }
      }}
    />
  );
}
