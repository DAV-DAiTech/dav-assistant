# Changelog

## v5 — 2026-11-13

- Moved the single persistent composer directly below the hero subtitle and above topics. Landing mode stays in document flow; conversation mode uses a safe-area-aware bottom dock with a 400ms layout transition. New chat restores the hero layout without duplicating the textarea.
- Added measured header clearance with 24px breathing room for anchor navigation, and measured dock clearance for conversation content. ResizeObserver callbacks defer work to animation frames and avoid writing to the observed element.
- Extracted `TopicSuggestions` with horizontal-only auto-centering, scroll-snap, desktop wheel conversion, mouse dragging with momentum, native touch scrolling, contextual 40px arrows, directional fade masks, a gradient progress indicator, and roving keyboard focus. Card transitions stagger by 50ms.
- Unified glass tokens across light and dark modes; refined the light header, focus border, send/stop states, listening ring, icon highlights, feature-card spotlights, subtle tilt, magnetic icons, and animated details popover. Reduced-motion settings disable decorative movement and momentum.
- Added translated carousel controls and regression tests for keyboard navigation, overflow metrics, and centering bounds. Backend, API adapters, storage, and preference persistence are unchanged.

### v5 validation

- `npx tsc --noEmit`, all 11 frontend regression tests, and `git diff --check` passed. Tests include dictionary parity, all ten topic sets, keyboard traversal, overflow/centering math, existing storage and mock-streaming behavior, and AA contrast for core text tokens on solid glass backings.
- Browser evidence at 958×604 in light mode confirmed hero/subtitle/composer/topic ordering, no document-width overflow, settled topic cards, keyboard access to the last topic, and directional arrow availability. No browser errors were reported during those checks.
- Browser automation timed out during the send/dock test and again on its single recovery attempt. Dock/reverse behavior, wheel/drag/touch gestures, the full 360/768/1280/1920 responsive matrix, dark/system interactions, and Lighthouse 90+ remain unverified. No Lighthouse or 60fps claim is made.

## v4 — 2026-11-13

- Replaced the active workspace with a componentized, frontend-only DAV experience. The remote restore commit’s backend removals and legacy configuration changes are preserved; only the Next.js frontend runtime files needed by this redesign are restored. The redesigned page makes no backend calls.
- Added navy, blue, sky, red, and ice design tokens in `app/design-tokens.css`; added responsive glass styling in `app/dav.css`.
- Restored Vietnamese-first VI/EN controls, Light/Dark/System preferences, responsive navigation, ecosystem mega-menu, QR sharing, and fullscreen controls.
- Added a random bilingual headline, ten configured topics with four prompts each, reveal animations, pointer spotlights, reduced-motion support, and a discovery section.
- Added `HistoryStore` and `ChatAdapter` interfaces in `lib/frontend/adapters.ts`. History uses localStorage by explicit request; the mock adapter has no API calls and does not claim factual answers.
- Added local conversation search, date groups, rename, pin, delete, undo, and clear-all confirmation.
- Added Markdown messages, reference links, copy, feedback, regeneration, stop, and a keyboard-accessible auto-growing composer.
- Attachment controls preview filenames only; voice input explicitly explains that recognition is not enabled. No files are uploaded and no microphone access is requested.
- Added the experimental DAItech disclaimer, hotline details, privacy guidance, local Vietnamese font subsets, first-paint theme restoration, accessible dialogs, and zoom support.

### Configuration

- Translation dictionary and bilingual headlines: `lib/frontend/i18n.ts`
- Topic labels and question sets: `lib/frontend/suggestions.ts`
- Ecosystem destinations and availability: `lib/frontend/ecosystem.ts`
- Frontend components: `components/dav/`

Ecosystem destinations without a verified URL are marked coming soon, rather than linking to guessed services. The data-updated footer identifies this build as sample data.

### Validation

- `npm run test:frontend`: eight regression tests cover dictionary parity, topic sets, ecosystem configuration, storage round-trips and malformed data, mock streaming, cancellation, and core text-token contrast.
- TypeScript and production compilation passed.
- Initial desktop screenshots were captured at 958×604 and 1280×900, and switching VI to EN was observed. The browser subsequently stopped responding; the complete mobile, theme, keyboard, and interaction matrix and Lighthouse 90+ target remain unverified. Later small refinements were checked with TypeScript and automated tests, not another browser pass.
