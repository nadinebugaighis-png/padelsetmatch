import { Link } from "@tanstack/react-router";

type Props = {
  size?: "sm" | "md" | "lg";
  to?: string;
  className?: string;
};

export function BrandMark({ size = "md", to = "/", className = "" }: Props) {
  const word =
    size === "sm"
      ? "text-[18px]"
      : size === "lg"
      ? "text-[30px]"
      : "text-[23px]";

  return (
    <Link
      to={to}
      className={`inline-flex items-baseline ${className}`}
      aria-label="Padel Match — home"
    >
      <span
        className={`text-serif leading-none text-[var(--ink)] ${word}`}
        style={{ fontWeight: 600, letterSpacing: "0" }}
      >
        Padel<span className="italic text-[var(--plum)]">Match</span>
      </span>
    </Link>
  );
}
