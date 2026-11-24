import type { ComponentProps } from "react";
import { photoSrc, type PhotoWidth } from "@/lib/photo-src";

type Props = Omit<ComponentProps<"img">, "src" | "onError"> & { url: string; w: PhotoWidth };

// For the viewer's own photo and admin moderation only: load the small version
// first and fall back to the saved original if the small one is refused (for
// example a photo still pending or just uploaded). Never use this for other
// players' photos, which must stay behind the privacy-checked small version.
export function SmallFirstPhoto({ url, w, alt = "", ...props }: Props) {
  return (
    <img
      {...props}
      alt={alt}
      src={photoSrc(url, w)}
      onError={(e) => {
        const el = e.currentTarget;
        if (el.getAttribute("src") !== url) el.src = url;
      }}
    />
  );
}
