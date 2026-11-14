// Phone keyboards often add a trailing space or a capital letter to an email
// (autocomplete, autofill). Strip invisible characters and spaces, lowercase.
export function normalizeEmail(raw: string): string {
  return raw.replace(/[\s\u200B-\u200D\uFEFF]/g, "").toLowerCase();
}

export class AuthTimeoutError extends Error {
  constructor() {
    super("auth_timeout");
    this.name = "AuthTimeoutError";
  }
}

// Never let a sign-in call freeze the page: if it has not answered in time,
// reject so the buttons become pressable again.
export function withAuthTimeout<T>(promise: Promise<T>, ms = 20_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new AuthTimeoutError()), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
