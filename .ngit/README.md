
## Deliberately not run

`tsc --noEmit` is not part of this workflow: it reports
pre-existing type errors on the default branch (`src/routes/setup.tsx`,
`src/routes/search.products.tsx` and others), so a type-check job would be red
from the first run. Fixing them is separate work; until then this workflow
covers the checks that do pass.
