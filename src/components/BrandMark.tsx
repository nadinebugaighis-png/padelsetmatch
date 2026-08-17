import { Link } from "@tanstack/react-router";
import wordmark from "@/assets/padel-set-match-wordmark.png.asset.json";

type Props = {
  size?: "sm" | "md" | "lg";
  to?: string;
  className?: string;
};

export function BrandMark({ size = "md", to = "/", className = "" }: Props) {
  // aspect ratio ~ 1179 / 188 ≈ 6.27
  const height =
    size === "sm"
      ? "h-5 md:h-6"
      : size === "lg"
      ? "h-9 md:h-11 lg:h-12"
      : "h-7 md:h-8 lg:h-9";

  return (
    <Link
      to={to}
      className={`inline-flex items-center ${className}`}
      aria-label="Padel Set Match — home"
    >
      <img
        src={wordmark.url}
        alt="Padel Set Match"
        className={`${height} w-auto select-none`}
        draggable={false}
      />
    </Link>
  );
}
