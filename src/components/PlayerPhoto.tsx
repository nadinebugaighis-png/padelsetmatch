import { useEffect, useRef, useState, type ComponentProps } from "react";
import { photoRetrySrc } from "@/lib/photo-src";

type Props = Omit<ComponentProps<"img">, "onError">;

// Each new source gets its own bounded retry lifecycle, including cleanup
// when a card closes or the player changes their photo.
export function PlayerPhoto(props: Props) {
  return <RetryingPhoto key={props.src} {...props} />;
}

function RetryingPhoto({ src, alt, ...props }: Props) {
  const [current, setCurrent] = useState(src);
  const [failed, setFailed] = useState(false);
  const attempts = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => { clearTimeout(timer.current); }, []);

  if (failed || !current) {
    return <div role="img" aria-label={alt} className={`${props.className ?? ""} flex items-center justify-center bg-[var(--paper-2)] text-serif text-6xl text-[var(--ink)]/15`}>
      {(alt ?? "?").charAt(0)}
    </div>;
  }

  return <img {...props} src={current} alt={alt} onError={() => {
    const attempt = ++attempts.current;
    const retry = typeof src === "string" ? photoRetrySrc(src, attempt) : undefined;
    if (!retry) { setFailed(true); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCurrent(retry), attempt * 500);
  }} />;
}