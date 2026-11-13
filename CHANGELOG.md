# Changelog

## v4 — 2026-11-13

- Replaced the active workspace with a componentized, frontend-only DAV experience; existing backend files are unchanged and are not called by the redesigned page.
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
