import { describe, expect, it } from "vitest";
import { parseAdultAge, isOrderedAgeRange, draftAfterSuccessfulSend, isAllowedShortLinkTarget, completeAccountDeletion } from "../src/lib/qa-safety";

describe("QA safety rules", () => {
  it("rejects under-18 entries instead of turning them into adults", () => {
    expect(parseAdultAge("17", 2026)).toBeNull();
    expect(parseAdultAge("2009", 2026)).toBeNull();
    expect(parseAdultAge("2027", 2026)).toBeNull();
    expect(parseAdultAge("100", 2026)).toBeNull();
    expect(parseAdultAge("", 2026)).toBeNull();
    expect(parseAdultAge("18", 2026)).toBe(18);
    expect(parseAdultAge("99", 2026)).toBe(99);
  });
  it("rejects reversed age ranges", () => {
    expect(isOrderedAgeRange(55, 18)).toBe(false);
    expect(isOrderedAgeRange(18, 55)).toBe(true);
  });
  it("does not clear newer drafts after an older send finishes", () => {
    expect(draftAfterSuccessfulSend("new message", "old message")).toBe("new message");
    expect(draftAfterSuccessfulSend(" old message ", "old message")).toBe("");
  });
  it("permits only this app's match links", () => {
    expect(isAllowedShortLinkTarget("https://padelsetmatch.com/g/abc")).toBe(true);
    expect(isAllowedShortLinkTarget("https://evil.lovable.app/g/abc")).toBe(false);
    expect(isAllowedShortLinkTarget("https://padelsetmatch.com.evil.com/g/abc")).toBe(false);
    expect(isAllowedShortLinkTarget("https://evil@padelsetmatch.com/g/abc")).toBe(false);
    expect(isAllowedShortLinkTarget("http://localhost/app/events/abc")).toBe(false);
  });
  it("never reports successful deletion when identity deletion fails", async () => {
    await expect(completeAccountDeletion({ removePhotos: async () => {}, removeProfile: async () => {}, removeIdentity: async () => { throw new Error("Identity deletion failed"); } })).rejects.toThrow("Identity deletion failed");
    await expect(completeAccountDeletion({ removePhotos: async () => {}, removeProfile: async () => {}, removeIdentity: async () => {} })).resolves.toEqual({ ok: true });
  });
});