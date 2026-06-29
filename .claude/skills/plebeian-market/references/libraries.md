# Libraries and Versions

## Core Dependencies

### Runtime & Framework

- **Runtime:** Bun (latest)
- **React:** ^19.2.6
- **React DOM:** ^19.2.6
- **TypeScript:** Via @types/bun ^1.3.14

### Routing

- **@tanstack/react-router:** ^1.169.2
- **@tanstack/router-cli:** ^1.166.43 (dev only, for route generation)
- **@tanstack/router-plugin:** ^1.167.35 (dev only)
- **@tanstack/react-router-devtools:** ^1.166.13 (dev only)

### State Management

- **@tanstack/react-store:** ^0.11.0
- **@tanstack/store:** ^0.11.0
- **@tanstack/react-query:** ^5.100.10
- **@tanstack/react-table:** ^8.21.3 (data tables)

### Form Management

- **@tanstack/react-form:** ^1.32.0
- **zod:** ^4.4.3 (validation)

### UI Components (shadcn/ui stack)

- **radix-ui:** ^1.4.3 (umbrella Radix UI package)
- **@radix-ui/react-alert-dialog:** ^1.1.15
- **@radix-ui/react-avatar:** ^1.1.11
- **@radix-ui/react-dialog:** ^1.1.15
- **@icons-pack/react-simple-icons:** ^13.13.0 (brand icons)

### Styling

- **tailwindcss:** ^4.3.0 (dev)
- **tailwindcss-animate:** ^1.0.7 (dev)
- **bun-plugin-tailwind:** ^0.1.2
- **class-variance-authority:** ^0.7.1 (CVA for variants)
- **clsx:** ^2.1.1
- **tailwind-merge:** ^3.6.0

### Nostr Protocol

- **@nostr-dev-kit/ndk:** 3.0.3 (core NDK)
- **@nostr-dev-kit/wallet:** 1.0.0 (wallet integrations)
- **@nostr-dev-kit/wot:** ^1.0.0 (web of trust)
- **@nostr-dev-kit/blossom:** ^8.0.0 (blob/media storage)
- **nostr-tools:** ^2.23.3

### Lightning / Bitcoin / Cashu

- **@getalby/lightning-tools:** ^8.1.1
- **bitcoinjs-lib:** ^7.0.1
- **bs58check:** ^4.0.0
- **light-bolt11-decoder:** ^3.2.0 (Lightning invoice decoding)
- **@cashu/cashu-ts:** ^2.1 (Cashu ecash)
- **coco-cashu-core:** ^1.0.0-rc11
- **coco-cashu-indexeddb:** ^1.0.0-rc11 (Cashu IndexedDB store)

### Cryptography

- **@noble/hashes:** ^2.2.0
- **@scure/base:** ^2.2.0
- **@scure/bip32:** ^2.2.0

### Icons & Media

- **lucide-react:** ^1.14.0 (icon library)
- **qrcode.react:** ^4.2.0
- **@yudiel/react-qr-scanner:** ^2.6.0

### Maps

- **maplibre-gl:** ^5.24.0

### Utilities

- **date-fns:** ^4.1.0 (date manipulation)
- **react-use:** ^17.6.0 (hook utilities)
- **uuid:** ^14.0.0
- **sonner:** ^2.0.7 (toast notifications)
- **next-themes:** ^0.4.6 (theme management)
- **@formkit/auto-animate:** ^0.9.0 (animations)
- **embla-carousel-react:** ^8.6.0 (carousels)
- **vaul:** ^1.1.2 (drawer component)

### AI / Integrations

- **@contextvm/sdk:** ^0.8.0 (ContextVM)
- **@modelcontextprotocol/sdk:** ^1.29.0 (MCP)

### Testing

- **playwright:** ^1.60.0 (dev)
- **@playwright/test:** ^1.60.0 (dev)
- **@faker-js/faker:** ^10.4.0 (dev, test data generation)

### Development

- **prettier:** ^3.8.3 (dev)
- **svgo:** ^4.0.1 (dev, SVG optimization)
- **ws:** ^8.20.1 (dev, WebSocket client for tooling)
- **@types/react:** ^19.2.14 (dev)
- **@types/react-dom:** ^19.2.3 (dev)
- **@types/bun:** ^1.3.14 (dev)
- **@types/ws:** ^8.18.1 (dev)
- **mini-svg-data-uri:** ^1.4.4 (dev)

## Version Policy

- Use exact versions (not semver ranges) where stability is critical
- NDK packages use specific versions to avoid breaking changes
- UI libraries use caret ranges for minor updates
- React 19 with concurrent features enabled

## Package Manager

Use **Bun** for all package management:

```bash
bun install <package>
bun add <package>
bun remove <package>
```

## Important Notes

1. **React 19:** Uses new concurrent features and hooks
2. **TanStack Router v1:** File-based routing requires CLI for route generation
3. **NDK:** Core library for Nostr protocol interactions
4. **Radix UI:** Accessible component primitives, styled with Tailwind
5. **Tailwind v4:** Uses new @theme directive instead of tailwind.config.js
