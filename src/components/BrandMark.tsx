import { Link } from "@tanstack/react-router";

type Props = {
  size?: "sm" | "md" | "lg";
  to?: string;
  className?: string;
};

export function BrandMark({ size = "md", to = "/", className = "" }: Props) {
  const word =
    size === "sm"
      ? "text-[20px] md:text-[24px] lg:text-[27px]"
      : size === "lg"
      ? "text-[30px] md:text-[36px] lg:text-[42px]"
      : "text-[23px] md:text-[28px] lg:text-[32px]";

  return (
    <Link
      to={to}
      className={`inline-flex items-baseline ${className}`}
      aria-label="Padel Set Match — home"
    >
      <span
        className={`text-serif leading-none text-[var(--ink)] ${word}`}
        style={{ fontWeight: 600, letterSpacing: "0" }}
      >
        Padel
        <span
          className="italic text-[var(--ink)]/50 mx-[0.12em]"
          style={{ fontWeight: 400 }}
        >
          Set
        </span>
        <span className="italic text-[var(--plum)]">Match</span>
      </span>
    </Link>
  );
}
