/**
 * Shared vault constants (ADR-017).
 */

/** PBKDF2 iteration count — the brief's >= 600k floor (OWASP 2023 guidance). */
export const PBKDF2_ITERATIONS = 600_000

/**
 * Minimum PBKDF2 iteration count accepted when OPENING an envelope.
 * `iterations` is attacker-writable localStorage: without this floor an
 * attacker can lower it (600k -> 1), exfiltrate the envelope, and brute-force
 * the passphrase offline at one iteration per guess. Envelopes below the
 * floor are rejected before any key derivation.
 */
export const MIN_PBKDF2_ITERATIONS = 100_000
