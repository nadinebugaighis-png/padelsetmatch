import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updatePlayerCardDetails } from "@/lib/app.functions";
import { useTr } from "@/lib/i18n";
import {
  PADEL_LEVEL_DETAILS,
  PLAY_FREQUENCIES,
  LOOKING_FOR_TAGS,
  MAIN_GOALS,
  LANGUAGES,
  type Profile,
} from "@/lib/types";

const NEW_STYLES = [
  "Defensive", "Strategic", "Balanced", "Aggressive", "Power hitter",
  "Fast & athletic", "Patient", "Creative", "Net specialist", "Smash lover",
];

type Draft = {
  level_detail: string | null;
  play_frequency: string | null;
  padel_style: string[];
  languages: string[];
  favorite_clubs: string[];
  other_sports: string[];
  looking_for_tags: string[];
  main_goal: string | null;
  bio: string;
};

function fromProfile(p: Profile): Draft {
  return {
    level_detail: p.level_detail ?? null,
    play_frequency: p.play_frequency ?? null,
    padel_style: (p.padel_style ?? []).slice(),
    languages: (p.languages ?? []).slice(),
    favorite_clubs: (p.favorite_clubs ?? []).slice(),
    other_sports: (p.other_sports ?? []).slice(),
    looking_for_tags: (p.looking_for_tags ?? []).slice(),
    main_goal: p.main_goal ?? null,
    bio: p.bio ?? "",
  };
}

export function PlayerCardDetailsForm({ profile }: { profile: Profile }) {
  const tr = useTr();
  const qc = useQueryClient();
  const save = useServerFn(updatePlayerCardDetails);
  const [d, setD] = useState<Draft>(() => fromProfile(profile));
  const [busy, setBusy] = useState(false);
  const [clubInput, setClubInput] = useState("");
  const [sportInput, setSportInput] = useState("");

  useEffect(() => {
    setD(fromProfile(profile));
  }, [profile.id]);

  const dirty = useMemo(() => {
    const base = fromProfile(profile);
    return JSON.stringify(base) !== JSON.stringify(d);
  }, [d, profile]);

  const toggle = (key: keyof Draft, value: string, cap = 99) => {
    setD((prev) => {
      const list = (prev[key] as string[]) ?? [];
      const has = list.includes(value);
      const next = has ? list.filter((x) => x !== value) : list.length >= cap ? list : [...list, value];
      return { ...prev, [key]: next };
    });
  };

  const addChip = (key: "favorite_clubs" | "other_sports", raw: string) => {
    const value = raw.trim();
    if (!value) return;
    setD((prev) => {
      const list = prev[key];
      if (list.includes(value) || list.length >= 10) return prev;
      return { ...prev, [key]: [...list, value] };
    });
  };

  const removeChip = (key: "favorite_clubs" | "other_sports", value: string) => {
    setD((prev) => ({ ...prev, [key]: prev[key].filter((x) => x !== value) }));
  };

  const onSave = async () => {
    setBusy(true);
    try {
      await save({
        data: {
          level_detail: d.level_detail,
          play_frequency: d.play_frequency,
          padel_style: d.padel_style,
          languages: d.languages,
          favorite_clubs: d.favorite_clubs,
          other_sports: d.other_sports,
          looking_for_tags: d.looking_for_tags,
          main_goal: d.main_goal,
          bio: d.bio.trim() || null,
        },
      });
      await qc.invalidateQueries({ queryKey: ["my-profile"] });
      await qc.invalidateQueries({ queryKey: ["discover"] });
      toast.success(tr("Saved ✓", "Guardado ✓", "Enregistré ✓"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("Could not save", "No se pudo guardar", "Impossible d'enregistrer"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Level */}
      <Field label={tr("🎾 Playing level", "🎾 Nivel de juego", "🎾 Niveau de jeu")}>
        <ChipGrid
          options={PADEL_LEVEL_DETAILS as unknown as string[]}
          selected={d.level_detail ? [d.level_detail] : []}
          onToggle={(v) => setD((p) => ({ ...p, level_detail: p.level_detail === v ? null : v }))}
        />
      </Field>

      {/* Style */}
      <Field
        label={tr("🎯 Playing style", "🎯 Estilo de juego", "🎯 Style de jeu")}
        hint={tr("Pick up to 3", "Elige hasta 3", "Choisis jusqu'à 3")}
      >
        <ChipGrid
          options={NEW_STYLES}
          selected={d.padel_style}
          onToggle={(v) => toggle("padel_style", v, 3)}
        />
      </Field>

      {/* Frequency */}
      <Field label={tr("📅 How often do you play?", "📅 ¿Con qué frecuencia juegas?", "📅 À quelle fréquence joues-tu ?")}>
        <ChipGrid
          options={PLAY_FREQUENCIES as unknown as string[]}
          selected={d.play_frequency ? [d.play_frequency] : []}
          onToggle={(v) => setD((p) => ({ ...p, play_frequency: p.play_frequency === v ? null : v }))}
        />
      </Field>

      {/* Languages */}
      <Field label={tr("🌍 Languages", "🌍 Idiomas", "🌍 Langues")}>
        <ChipGrid
          options={LANGUAGES as unknown as string[]}
          selected={d.languages}
          onToggle={(v) => toggle("languages", v, 10)}
        />
      </Field>

      {/* Favorite clubs — free text */}
      <Field label={tr("📍 Favorite clubs", "📍 Clubes favoritos", "📍 Clubs favoris")}>
        <ChipInputRow
          placeholder={tr("Type a club name and press +", "Escribe un club y pulsa +", "Tape un club et appuie sur +")}
          value={clubInput}
          onChange={setClubInput}
          onAdd={() => { addChip("favorite_clubs", clubInput); setClubInput(""); }}
        />
        <RemovableChips items={d.favorite_clubs} onRemove={(v) => removeChip("favorite_clubs", v)} />
      </Field>

      {/* Other sports — free text */}
      <Field label={tr("🏃 Other sports", "🏃 Otros deportes", "🏃 Autres sports")}>
        <ChipInputRow
          placeholder={tr("e.g. Running, Yoga…", "p. ej. Running, Yoga…", "p. ex. Running, Yoga…")}
          value={sportInput}
          onChange={setSportInput}
          onAdd={() => { addChip("other_sports", sportInput); setSportInput(""); }}
        />
        <RemovableChips items={d.other_sports} onRemove={(v) => removeChip("other_sports", v)} />
      </Field>

      {/* Looking for */}
      <Field label={tr("💡 What are you looking for?", "💡 ¿Qué buscas?", "💡 Qu'est-ce que tu cherches ?")}>
        <ChipGrid
          options={LOOKING_FOR_TAGS as unknown as string[]}
          selected={d.looking_for_tags}
          onToggle={(v) => toggle("looking_for_tags", v, 15)}
        />
      </Field>

      {/* Main goal */}
      <Field label={tr("⭐ Your main goal", "⭐ Tu objetivo principal", "⭐ Ton objectif principal")}>
        <ChipGrid
          options={MAIN_GOALS as unknown as string[]}
          selected={d.main_goal ? [d.main_goal] : []}
          onToggle={(v) => setD((p) => ({ ...p, main_goal: p.main_goal === v ? null : v }))}
        />
      </Field>

      {/* Bio */}
      <Field label={tr("✍️ Bio", "✍️ Bio", "✍️ Bio")}>
        <Textarea
          value={d.bio}
          maxLength={280}
          onChange={(e) => setD((p) => ({ ...p, bio: e.target.value.slice(0, 280) }))}
          placeholder={tr("A short line about you (optional)", "Una línea corta sobre ti (opcional)", "Une courte phrase sur toi (optionnel)")}
          className="min-h-[80px] border-[var(--ink)]/20 text-[var(--ink)] placeholder:text-[var(--ink)]/40"
        />
        <div className="text-[10px] text-[var(--ink)]/40 text-right mt-1">{d.bio.length}/280</div>
      </Field>

      <div className="sticky bottom-2 flex justify-end pt-2">
        <Button onClick={onSave} disabled={!dirty || busy} className="min-w-[140px]">
          {busy ? tr("Saving…", "Guardando…", "Enregistrement…") : tr("Save changes", "Guardar cambios", "Enregistrer")}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-[13px] font-semibold text-[var(--ink)]">{label}</div>
        {hint && <div className="text-[10px] text-[var(--ink)]/50">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function ChipGrid({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className={`px-3 h-8 rounded-full text-xs border transition ${
              on
                ? "bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]"
                : "bg-white text-[var(--ink)] border-[var(--ink)]/20 hover:border-[var(--ink)]/40"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function ChipInputRow({ value, onChange, onAdd, placeholder }: { value: string; onChange: (v: string) => void; onAdd: () => void; placeholder: string }) {
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }}
        placeholder={placeholder}
        maxLength={120}
        className="flex-1 h-9 rounded-lg border border-[var(--ink)]/20 bg-white px-3 text-sm text-[var(--ink)] placeholder:text-[var(--ink)]/40 focus:outline-none focus:border-[var(--ink)]/50"
      />
      <button
        type="button"
        onClick={onAdd}
        className="h-9 px-3 rounded-lg bg-[var(--ink)] text-[var(--paper)] text-sm font-semibold"
      >
        +
      </button>
    </div>
  );
}

function RemovableChips({ items, onRemove }: { items: string[]; onRemove: (v: string) => void }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {items.map((v) => (
        <span key={v} className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-[var(--ink)]/[0.06] border border-[var(--ink)]/15 text-xs text-[var(--ink)]">
          {v}
          <button
            type="button"
            onClick={() => onRemove(v)}
            aria-label={`Remove ${v}`}
            className="text-[var(--ink)]/50 hover:text-[var(--ink)] leading-none"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
