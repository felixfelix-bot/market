/**
 * Kind registry for Plebeian Market auction events.
 *
 * These kinds are defined in the auction spec (AUCTIOINS.md) and the V4V dev
 * splits ADR (`docs/adr/proposals/v4v-dev-splits-auction.md`).
 *
 * - 30408: Auction Listing (addressable, updatable — NIP-33)
 * - 30409: Validator Fee Announcement (parameterized replaceable — NIP-33)
 * - 1023:  Auction Bid Commitment (regular event)
 * - 1024:  Auction Settlement (regular event)
 */

/** Auction listing — seller publishes to start an auction. */
export const AUCTION_LISTING_KIND = 30408 as const

/** Validator fee announcement — validators announce fees + compatibility. */
export const VALIDATOR_FEE_ANNOUNCEMENT_KIND = 30409 as const

/** Auction bid commitment — bidder locks e-cash notes. */
export const AUCTION_BID_KIND = 1023 as const

/** Auction settlement — winner reveals derivation path. */
export const AUCTION_SETTLEMENT_KIND = 1024 as const

/** Default settlement window / max duration: 30 days in seconds. */
export const DEFAULT_MAX_DURATION_SECONDS = 2_592_000 as const

/** Total basis points representing 100%. */
export const TOTAL_BPS = 10_000 as const
