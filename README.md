# Market Frontend

To install dependencies:

```bash
bun install
```

To start a development server:

```bash
bun dev
```

To run for production:

```bash
bun start
```

This project was created using `bun init` in bun v1.2.4. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

## Getting Started

### Initial Setup

1. Install dependencies with `bun install`
2. Copy `.env.example` to `.env` and configure your environment variables:
   - `APP_RELAY_URL`: Your relay URL
   - `APP_PRIVATE_KEY`: Your private key for initialization
3. Set up a development relay (required for local development)
   - We recommend using [nak](https://github.com/fiatjaf/nak) for development:

     ```bash
     # Install nak
     go install github.com/fiatjaf/nak@latest

     # Start a local relay
     nak serve
     ```

   - The relay will be available at `ws://localhost:10547`
   - Update your `.env` file with this relay URL

4. Initialize the application with default settings:
   ```bash
   bun run startup
   ```
   This will create:
   - Default app settings
   - User roles configuration
   - Ban list
   - Relay list

### First Run

When you first start the application:

1. If no settings are found in the configured relay, you'll be automatically redirected to `/setup`
2. The first user to complete the setup process becomes the administrator
   - Skip this step if you've run the startup script, as it creates default admin users
3. Complete the setup form to configure your marketplace settings
   - Skip this if you've run the startup script and want to use the default configuration

### Development Workflow

1. Start the development server:

   ```bash
   bun dev:seed
   ```

   _start without seeding for a fresh start with no setup data_

   ```bash
   bun dev
   ```

2. In a separate terminal, run the route watcher:

   ```bash
   bun run watch-routes
   ```

3. Optional: Seed the relay with test data:
   ```bash
   bun seed
   ```

## React Query

This project uses TanStack React Query (v5) for data fetching, caching, and state management. React Query helps with:

- Fetching, caching, and updating server state in your React applications
- Automatic refetching when data becomes stale
- Loading and error states handling
- Pagination and infinite scrolling

In our implementation, query functions and options are defined in the `src/queries` directory, using a pattern that separates query key factories and query functions.

Example:

```tsx
// Query key factory pattern for organized cache management
export const postKeys = {
	all: ['posts'] as const,
	details: (id: string) => [...postKeys.all, id] as const,
}

// Query options for use in routes and components
export const postsQueryOptions = queryOptions({
	queryKey: postKeys.all,
	queryFn: fetchPosts,
})
```

## Routing and Prefetching

This project uses TanStack Router for file-based routing with built-in prefetching capabilities:

- File-based routing: Routes are defined in the `src/routes` directory
- Dynamic routes: Parameters in file names (e.g., `posts.$postId.tsx`)
- Automatic route tree generation

Data prefetching is implemented via loader functions in route files:

```tsx
export const Route = createFileRoute('/posts/')({
	loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(postsQueryOptions),
	component: PostsRoute,
})
```

The router is configured to prefetch data on "intent" (hovering over links) with zero stale time to ensure fresh data:

```tsx
const router = createRouter({
	routeTree,
	context: {
		queryClient,
		nostr: nostrService,
	},
	defaultPreload: 'intent',
	defaultPreloadStaleTime: 0,
})
```

## Development Workflow

### .env variables

Set the .env variables by copying and renaming the `.env.example` file, then set your own values for the variables.

### Development relay

During development, you should spin up a relay to seed data and use it during the development cycle, you can use `nak serve` as a quick solution, or run another relay locally, then set it in your `.env` variables, and run `bun seed` to seed it.

### watch-routes Command

During development, you should run the `watch-routes` command in a separate terminal:

```bash
bun run watch-routes
```

This command uses the TanStack Router CLI (`tsr watch`) to monitor your route files and automatically generate the route tree file (`src/routeTree.gen.ts`). This file connects all your route components into a coherent navigation structure.

Without running this command, changes to route files or creating new routes won't be detected until you manually generate the route tree or restart the server.

## Quality Hooks

A **pre-push** git hook is installed for this repo that runs a local quality gate
before any push is accepted. Its goal is to keep `master` green by catching
breakages locally instead of in CI.

### What the hook does

The installed `.git/hooks/pre-push` is a thin wrapper that execs a shared checker
(`~/scripts/check-quality.sh`) against the repository root. That checker runs
three gates in order:

1. **Tests (blocking)** — runs the project's test suite. The push is blocked
   (exit 1) if any test fails.
2. **Coverage (blocking)** — enforces a minimum coverage percentage read from
   `.coverage-threshold` in the repo root (currently **90**). The push is blocked
   if coverage falls below the threshold.
3. **Doc drift (non-blocking warning)** — if source files are staged but no
   documentation (`.md`/`.txt`) is included in the same push, a warning is
   printed. The push still continues.

If all blocking gates pass, the push proceeds normally.

### The `.coverage-threshold` file

`.coverage-threshold` at the repo root contains a single integer (default `90`)
that sets the coverage floor enforced by Gate 2. Bump it to raise the bar; the
checker reads it fresh on every push.

### Test layout

The project's test command is **Bun** (`bun test`), not vitest. The hook runs
`bun test`. The repo organises tests into three layers via `package.json`
scripts:

- `bun run test:unit` — unit tests (scoped to `contextvm`, `src/queries/__tests__`,
  `src/lib/__tests__`, excluding `*.integration.test.ts`). This is the fast,
  network-free suite you should run locally while iterating.
- `bun run test:integration` — integration tests under `src/lib/__tests__`
  (`*.integration.test.ts`).
- `bun run test:e2e` — **Playwright** end-to-end tests, configured at
  `e2e/playwright.config.ts`. These drive a real browser and are part of the
  project's coverage story; run them with `bun run test:e2e` (or `:headed` / `:ui`
  / `:debug` variants). E2E coverage is reported by the CI `e2e.yml` workflow.

### Bypassing the hook

To skip the gate for a single push — e.g. a backup/WIP push or when the gate is
misbehaving — use:

```bash
git push --no-verify
```

Use this sparingly. It exists for convenience, not for shipping known-broken
code. CI still runs on the remote, so a `--no-verify` push that skips a local
test failure will still fail in CI.

### Installing / reinstalling / removing

The hook is installed by `~/scripts/install-quality-hooks.sh`. To (re)install or
repair it:

```bash
~/scripts/install-quality-hooks.sh /path/to/this/repo
```

It is idempotent and backs up any pre-existing foreign `pre-push` hook to
`pre-push.bak-pre-quality` before installing. To remove it and restore the
backup:

```bash
~/scripts/install-quality-hooks.sh --uninstall /path/to/this/repo
```

## Releasing

Staging deploys automatically after the `E2E Tests` workflow succeeds on `master`.
Production deploys require the `production` environment approval and can be triggered
either by pushing a `*-release` tag or by running the `Promote to Production`
workflow, which creates the next release tag for you.

### One-liner

```bash
git tag v0.2.9-release && git push origin v0.2.9-release
```

### Steps

1. Ensure all changes are merged to `master`
2. Wait for staging deployment to finish successfully
3. Either:
   Create and push a new tag with incremented version:
   ```bash
   git tag vX.Y.Z-release && git push origin vX.Y.Z-release
   ```
4. Or run `Promote to Production` in GitHub Actions and choose `patch`, `minor`, or `major`
5. The `Deploy to Production` workflow will build and deploy the selected tag after approval
