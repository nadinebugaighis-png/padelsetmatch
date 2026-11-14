import { useState } from "react";
import { Check, MessageCircle } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { COURT_TYPES, clubWhatsappBooking, clubWhatsappBookingUrl, type CourtTypeKey } from "@/lib/club-booking";
import { useTr } from "@/lib/i18n";

type Props = {
  clubName: string | null | undefined;
  startsAt: Date | string | null | undefined;
  hostName?: string | null;
  placement: "match_page" | "match_form";
  /** Rendered as the trigger; receives an open() callback. */
  trigger: (open: () => void, label: string) => React.ReactNode;
  /** Optional: lets the host mark the court booked once the club confirms. */
  onConfirmed?: () => void | Promise<void>;
};

/**
 * Host-only: pick the court type, then WhatsApp opens on the club's number with the
 * booking request already written. The host stays in charge of the reservation.
 */
export function ClubWhatsAppBooking({ clubName, startsAt, hostName, placement, trigger, onConfirmed }: Props) {
  const tr = useTr();
  const [open, setOpen] = useState(false);
  const [court, setCourt] = useState<CourtTypeKey>("any");
  const [sent, setSent] = useState(false);
  const club = clubWhatsappBooking(clubName);
  if (!club || !startsAt) return null;
  const url = clubWhatsappBookingUrl({ clubName, startsAt, courtType: court, hostName });
  if (!url) return null;

  const label = tr("Book by WhatsApp", "Reservar por WhatsApp", "Réserver par WhatsApp");

  return (
    <>
      {trigger(() => { setSent(false); setOpen(true); }, label)}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="bg-[var(--paper)] border-[var(--ink)]/10">
          <div className="mx-auto w-full max-w-md px-6 pt-4 pb-8">
            <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--ink)]/50 text-center">
              {tr("Direct booking", "Reserva directa", "Réservation directe")}
            </div>
            <DrawerTitle asChild>
              <div className="text-serif text-[24px] leading-tight text-[var(--ink)] font-normal text-center mt-1">{club.displayName}</div>
            </DrawerTitle>
            <DrawerDescription className="mt-2 text-center text-[13px] leading-relaxed text-[var(--ink)]/65">
              {tr(
                "Choose the court you'd like. WhatsApp opens with your request already written — just tap Send.",
                "Elige la pista que prefieres. WhatsApp se abre con tu solicitud ya escrita: solo pulsa Enviar.",
                "Choisis le terrain souhaité. WhatsApp s'ouvre avec ta demande déjà rédigée — appuie simplement sur Envoyer.",
              )}
            </DrawerDescription>

            <div className="mt-5 h-px bg-[var(--ink)]/10" />
            <div role="radiogroup" aria-label={tr("Court type", "Tipo de pista", "Type de terrain")} className="divide-y divide-[var(--ink)]/10">
              {COURT_TYPES.filter((c) => club.courts.includes(c.key)).map((c) => {
                const active = court === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setCourt(c.key)}
                    className="w-full flex items-center justify-between py-3.5 text-left"
                  >
                    <span className={`text-[15px] ${active ? "text-[var(--ink)] font-medium" : "text-[var(--ink)]/75"}`}>
                      {tr(c.en, c.es, c.fr)}
                    </span>
                    <span className={`w-5 h-5 rounded-full border flex items-center justify-center ${active ? "border-[var(--ink)] bg-[var(--ink)]" : "border-[var(--ink)]/25"}`}>
                      {active && <Check className="w-3 h-3 text-[var(--paper)]" />}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="h-px bg-[var(--ink)]/10" />

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                setSent(true);
                window.__lovableEvents?.track?.("project.book_court_clicked", {
                  club: club.club,
                  source: "whatsapp",
                  placement,
                  court_type: court,
                  court_booked: false,
                });
              }}
              className="mt-6 w-full h-12 rounded-full bg-[var(--ink)] text-[var(--paper)] inline-flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]"
            >
              <MessageCircle className="w-4 h-4" /> {tr("Open WhatsApp", "Abrir WhatsApp", "Ouvrir WhatsApp")}
            </a>

            {sent && onConfirmed ? (
              <button
                type="button"
                onClick={async () => { await onConfirmed(); setOpen(false); }}
                className="mt-3 w-full h-11 rounded-full border border-[var(--ink)]/20 text-[var(--ink)] text-xs font-semibold uppercase tracking-[0.2em]"
              >
                {tr("Club confirmed — mark court booked", "Club confirmado — marcar pista reservada", "Club confirmé — marquer réservée")}
              </button>
            ) : (
              <p className="mt-3 text-center text-[11px] leading-relaxed text-[var(--ink)]/50">
                {tr(
                  "Once the club confirms, mark the court as booked so your players know.",
                  "Cuando el club confirme, marca la pista como reservada para que tus jugadores lo sepan.",
                  "Quand le club confirme, marque le terrain comme réservé pour prévenir tes joueurs.",
                )}
              </p>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
