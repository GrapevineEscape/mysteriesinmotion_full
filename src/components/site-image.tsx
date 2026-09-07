import { ImageSlot } from "@/components/image-slot";
import type { ImageSlotSpec } from "@/lib/customer-images";
import { resolveCustomerImage } from "@/lib/resolve-customer-image";

/** Server helper: resolve drop-folder file, then render ImageSlot. */
export function SiteImage({
  spec,
  preferSrc,
  className,
  fill = true,
  alt,
}: {
  spec: ImageSlotSpec;
  preferSrc?: string | null;
  className?: string;
  fill?: boolean;
  alt?: string;
}) {
  const local = resolveCustomerImage(spec.file);
  return (
    <ImageSlot
      fill={fill}
      className={className}
      candidates={[preferSrc, local]}
      spec={spec}
      alt={alt}
    />
  );
}
