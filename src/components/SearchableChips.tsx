import { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";


type Props = {
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
  onAddCustom?: (value: string) => void;
  labelFn?: (value: string) => string;
  placeholder: string;
  addWord: string; // e.g. "Add" / "Añadir" / "Ajouter"
  moreWord: string; // e.g. "more"
  lessWord: string; // e.g. "Show less"
  emptyHint?: string;
  initialVisible?: number; // when list is long, collapse to this many + selected
  compact?: boolean;
};

export function SearchableChips({
  options,
  selected,
  onToggle,
  onAddCustom,
  labelFn,
  placeholder,
  addWord,
  moreWord,
  lessWord,
  emptyHint,
  initialVisible,
}: Props) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const q = query.trim().toLowerCase();
  const label = labelFn ?? ((v: string) => v);

  const collapse = !!initialVisible && !showAll && !q;
  const base = collapse
    ? Array.from(new Set([...options.slice(0, initialVisible), ...selected.filter((s) => options.includes(s))]))
    : options;
  const visible = q
    ? options.filter((o) => label(o).toLowerCase().includes(q) || o.toLowerCase().includes(q))
    : base;
  const hiddenCount = collapse ? options.length - base.length : 0;

  const trimmed = query.trim();
  const canAddCustom =
    !!onAddCustom &&
    trimmed.length >= 2 &&
    !selected.some((s) => s.toLowerCase() === trimmed.toLowerCase()) &&
    !options.some((o) => o.toLowerCase() === trimmed.toLowerCase() || label(o).toLowerCase() === trimmed.toLowerCase());

  const doAdd = () => {
    if (!canAddCustom || !onAddCustom) return;
    const name = trimmed.replace(/\s+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    onAddCustom(name);
    setQuery("");
  };

  const customSelected = selected.filter((s) => !options.includes(s));

  return (
    <div className="mt-1 space-y-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            doAdd();
          }
        }}
        placeholder={placeholder}
        className="w-full bg-transparent border border-[var(--cream)]/20 rounded-md h-9 px-2 text-sm"
      />
      {customSelected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {customSelected.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onToggle(s)}
              className="chip-paper chip-paper-selected"
            >
              ✓ {s}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {visible.map((o) => {
          const on = selected.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => onToggle(o)}
              className={`chip-paper ${on ? "chip-paper-selected" : ""}`}
            >
              {on ? "✓ " : "+ "}
              {label(o)}
            </button>
          );
        })}
        {canAddCustom && (
          <button type="button" onClick={doAdd} className="chip-paper">
            + {addWord} "{trimmed}"
          </button>
        )}
        {hiddenCount > 0 && (
          <button type="button" onClick={() => setShowAll(true)} className="chip-paper">
            + {hiddenCount} {moreWord}
          </button>
        )}
        {showAll && !q && initialVisible && (
          <button type="button" onClick={() => setShowAll(false)} className="chip-paper">
            − {lessWord}
          </button>
        )}
      </div>
      {visible.length === 0 && !canAddCustom && emptyHint && (
        <p className="text-xs text-[var(--ink)]/60">{emptyHint}</p>
      )}
    </div>
  );
}
