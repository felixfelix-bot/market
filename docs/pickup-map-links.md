# Pickup location map links

Pickup locations are stored with a user-supplied map link URL instead of a
free-text address that has to be geocoded later. `parseCoordsFromLink()` in
`src/lib/utils/mapLinks.ts` turns such a link into `{ lat, lon }` coordinates
for map rendering, purely client-side.

This is the first step of replacing the runtime Nominatim geocoding currently
performed when the pickup dialog opens (`src/components/dialogs/PickupLocationDialog.tsx`
fetches `nominatim.openstreetmap.org` at render time). Parsing the coordinates
from the link at save/render time removes that external-service dependency.

## Supported link formats

| Source          | Format                       | Example                                                 |
| --------------- | ---------------------------- | ------------------------------------------------------- |
| OpenStreetMap   | `#map=<zoom>/<lat>/<lon>`    | `https://www.openstreetmap.org/#map=17/51.5074/-0.1278` |
| BTC Map         | `#<zoom>/<lat>/<lon>`        | `https://btcmap.org/map#9/41.0082/28.9784`              |
| BTC Map (share) | `#<lat>/<lon>` at end of URL | `https://btcmap.org/map#41.0082/28.9784`                |
| Google Maps     | `@<lat>,<lon>`               | `https://www.google.com/maps/@51.5074,-0.1278,15z`      |
| Google Maps     | `?q=<lat>,<lon>`             | `https://maps.google.com/?q=51.5074,-0.1278`            |

## Parsing contract

- Returns `{ lat, lon }` for the first format that matches.
- Coordinates are range-checked: latitude −90..90, longitude −180..180.
  Out-of-range values are invalid input.
- Returns `null` for: unrecognized links, links without coordinates, empty
  strings, nullish values, non-numeric `q` parameters, and incomplete hashes.
- Pure string parsing — no network requests.
- Unit tests: `src/lib/__tests__/mapLinks.test.ts`.
