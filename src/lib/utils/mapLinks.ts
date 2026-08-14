/**
 * Geographic coordinates parsed from a map link URL.
 */
export type MapLinkCoords = {
	lat: number
	lon: number
}

// #zoom/lat/lon — OpenStreetMap (`#map=17/lat/lon`) and BTC Map (`#9/lat/lon`)
const ZOOM_LAT_LON_RE = /#(?:map=)?\d+\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/

// #lat/lon at the end of the URL — two-segment hash without a zoom level
const HASH_LAT_LON_RE = /#(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/

// @lat,lon — Google Maps viewport marker
const AT_LAT_LON_RE = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/

// ?q=lat,lon or &q=lat,lon — Google Maps query parameter
const Q_LAT_LON_RE = /[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/

function coordsFromMatch(match: RegExpMatchArray | null): MapLinkCoords | null {
	if (!match) return null
	const lat = parseFloat(match[1])
	const lon = parseFloat(match[2])
	if (Number.isNaN(lat) || Number.isNaN(lon)) return null
	if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
	return { lat, lon }
}

/**
 * Extract geographic coordinates from a user-supplied map link.
 *
 * Supported URL formats:
 * - `#map=<zoom>/<lat>/<lon>` — OpenStreetMap
 * - `#<zoom>/<lat>/<lon>` — BTC Map
 * - `#<lat>/<lon>` — two-segment hash (end of URL)
 * - `@<lat>,<lon>` — Google Maps viewport
 * - `?q=<lat>,<lon>` / `&q=<lat>,<lon>` — Google Maps query
 *
 * Returns `{ lat, lon }` for the first format that yields coordinates within
 * the valid ranges (lat −90..90, lon −180..180), otherwise `null`. Coordinates
 * outside those ranges are treated as invalid input, as are empty or nullish
 * values. Pure string parsing — no network geocoding.
 */
export function parseCoordsFromLink(link: string): MapLinkCoords | null {
	if (typeof link !== 'string' || link.length === 0) return null

	return (
		coordsFromMatch(link.match(ZOOM_LAT_LON_RE)) ??
		coordsFromMatch(link.match(HASH_LAT_LON_RE)) ??
		coordsFromMatch(link.match(AT_LAT_LON_RE)) ??
		coordsFromMatch(link.match(Q_LAT_LON_RE))
	)
}
