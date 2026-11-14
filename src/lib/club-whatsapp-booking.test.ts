import { describe, expect, it } from "vitest";
import { clubBookingMessage, clubWhatsappBooking, clubWhatsappBookingUrl } from "./club-booking";

// Sat 21 Nov 2026, 09:30 Madrid (UTC+1)
const START = "2026-11-21T08:30:00.000Z";

describe("club WhatsApp booking", () => {
  it("sends Club de Pádel La Moraleja requests to +34 647 10 33 75", () => {
    const url = clubWhatsappBookingUrl({ clubName: "Club de Pádel La Moraleja", startsAt: START, courtType: "glass_outdoor" });
    expect(url?.startsWith("https://wa.me/34647103375?text=")).toBe(true);
  });

  it("is not offered for clubs without WhatsApp booking", () => {
    expect(clubWhatsappBooking("Club Irlandesas")).toBeNull();
    expect(clubWhatsappBooking("Riber Pádel Moraleja Club")).toBeNull();
  });

  it("writes the day and a 90-minute slot in Madrid time", () => {
    const msg = clubBookingMessage({ clubDisplayName: "Club de Pádel La Moraleja", startsAt: START, courtType: "any" });
    expect(msg).toContain("Día: sábado, 21 de noviembre");
    expect(msg).toContain("Hora: 09:30–11:00");
  });

  it("names each of the club's three court types in Spanish", () => {
    const pista = (courtType: "glass_outdoor" | "wall_outdoor" | "wall_covered") =>
      clubBookingMessage({ clubDisplayName: "X", startsAt: START, courtType });
    expect(pista("glass_outdoor")).toContain("Pista: Cristal exterior");
    expect(pista("wall_outdoor")).toContain("Pista: Muro exterior");
    expect(pista("wall_covered")).toContain("Pista: Cubierta de muro");
  });

  it("includes the host's name only when known", () => {
    expect(clubBookingMessage({ clubDisplayName: "X", startsAt: START, courtType: "any", hostName: "Nadine" })).toContain("Nombre: Nadine");
    expect(clubBookingMessage({ clubDisplayName: "X", startsAt: START, courtType: "any" })).not.toContain("Nombre:");
  });
});
