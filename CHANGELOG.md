# Changelog

## v6 — 2026-11-14

### Presentation

- Replaced the header bottom line with a single neon scroll-progress line (track, glowing bar and comet head) inset by the header radius; it fades in while scrolling and dims when idle. Removed the duplicate static ombre underline.
- Replaced the composer rotating border with a shared SVG border beam that follows the rounded outline, brightens on focus/typing and pulses once on send. Added a solid focus ring; reduced motion shows a static gradient outline.
- Added registered `--progress-*` and `--beam-*` Light/Dark tokens that cross-fade on theme change.

- Default first visit to Light, independently of OS preference. Existing Light/Dark/System and language choices are preserved. Root `data-ombre="blue-white"` selects blue/sky/white borders; `blue-red` selects the alternate token.
- Added near-black text, white surfaces, blue ombre double-background borders, inner highlights, 20px glass blur and soft blue shadows across header/navigation/controls, topics/cards, composer/messages, menus/dialogs, popovers and notifications. Dark mode uses separate contrast-tested surfaces.
- Primary fills use deep blue with the brightest stop beyond the visible fill to preserve white-label contrast. Focus/hover borders rotate over six seconds. Header bottom edge fades; ambient decoration stays faint in Light.
- Set a 13px minimum for UI text; desktop messages 18px (user 17px), mobile messages 16.5px, message line-height 1.7, code 15px, sender 14.5px, source chips 14px, composer 18px desktop/17px mobile, 17px placeholder, 52px send button, 15.5px topic labels and 16.5px suggestion text. Added keyboard-focusable horizontal overflow for Markdown tables.
- Preserved the header, navigation, language/theme controls, More/QR/fullscreen, composer/attachments/voice availability notices, nine question sets plus linked club entry, discovery cards, history actions, and scroll/hover effects. Headlines now cycle between the existing three variants; reduced motion holds one variant.
- Added live DAV Club Match second in the ecosystem list, replacing the former clubs product. The topic link stays in position nine with no question set; arrow-key focus visits it without changing selection. Enter/Space open the destination. Discovery card 05 links directly; the ecosystem teaser still opens the modal.
- Extracted a componentized ecosystem dialog. Native modal semantics, explicit Tab wrapping, Esc/backdrop/X closure, focus restoration, scroll lock, trigger-relative origin, 460ms opening, 250ms closing, 60ms card stagger, cursor highlights, capped tilt and reduced-motion alternatives. Mobile uses a single-column bottom sheet and swipe-down handle. Coming-soon cards remain buttons and announce a notification inside the dialog top layer.
- Messages now display only source metadata returned with the response, with safe HTTP(S) source URLs; no assumed source citation is added. Response content and all transport/storage behavior remain unchanged.
- Localized browser titles/descriptions/social metadata use the full club name. Theme changes also update browser chrome color.

### String replacement inventory

The keys below identify every replaced/removed UI string. Quoted values are the new text; removed response bodies and retired labels are intentionally not reproduced in the current UI.

| Location / key | Vietnamese | English |
| --- | --- | --- |
| `attachmentNote` | Tệp chỉ được xem tên, chưa được tải lên hay đọc. Vui lòng nhập nội dung câu hỏi. | Only filenames are shown. Files are not uploaded or read. Please type your question. |
| `micNote` | Nhận dạng giọng nói chưa khả dụng. Hãy nhập câu hỏi của bạn. | Voice recognition is not available yet. Please type your question. |
| `disclaimer` + linked domain | DAV Assistant do CLB DAiTech phát triển. Câu trả lời có thể chưa đầy đủ, vui lòng đối chiếu tại dav.edu.vn. | DAV Assistant is built by DAiTech Club. Answers may be incomplete; please verify at dav.edu.vn. |
| `privacy` | Vui lòng không chia sẻ thông tin cá nhân. | Please do not share personal information. |
| `online` | Sẵn sàng (unchanged) | Ready |
| `offline` | Mất kết nối | Disconnected |
| `local` | Lịch sử trò chuyện | Conversation history |
| `confirmCopy` | Các cuộc trò chuyện của bạn sẽ bị xóa. Bạn có thể hoàn tác ngay sau đó. | Your conversations will be deleted. You can undo immediately afterwards. |
| `storageError` | Không thể truy cập lịch sử trò chuyện. Vui lòng kiểm tra kết nối và thử lại. | Could not access conversation history. Check your connection and retry. |
| `ecosystemTeaserCopy` | Học tập, khám phá và kết nối cùng cộng đồng Ngoại giao. | Learn, discover, and connect with the diplomatic community. |
| `featureDescriptions[5]` | Mở rộng tầm nhìn vượt mọi biên giới. | Expand your horizons beyond borders. |
| `footer` | © 2026 CLB AI & Công nghệ Học viện Ngoại giao – DAiTech | © 2026 AI & Technology Club, Diplomatic Academy of Vietnam – DAiTech |
| `connectionNote` | Trạng thái kết nối với DAV Assistant. | Connection status for DAV Assistant. |
| New `clubFullName` / Details | CLB AI & Công nghệ Học viện Ngoại giao – DAiTech | AI & Technology Club, Diplomatic Academy of Vietnam – DAiTech |
| New `openClubMatch` / link aria-labels | Mở DAV Club Match trong tab mới | Open DAV Club Match in a new tab |
| New `table` | Bảng thông tin | Information table |
| Ecosystem kicker | DAiTech × DAV | DAiTech × DAV |
| Ecosystem replacement product title | DAV Club Match | DAV Club Match |
| Ecosystem replacement product description | Kết nối CLB · Đoàn · Hội. Tìm cộng đồng phù hợp với bạn. | Connecting clubs, Youth Union and associations. Find the community that fits you. |
| Page title / social title | DAV Assistant — CLB AI & Công nghệ Học viện Ngoại giao – DAiTech | DAV Assistant — AI & Technology Club, Diplomatic Academy of Vietnam – DAiTech |
| Page / social description | Trợ lý AI song ngữ do CLB AI & Công nghệ Học viện Ngoại giao – DAiTech phát triển. Khám phá tuyển sinh, học phí, học bổng và cuộc sống sinh viên. | A bilingual AI assistant by AI & Technology Club, Diplomatic Academy of Vietnam – DAiTech. Explore admissions, tuition, scholarships, and student life. |
| Removed status/composer/message mode labels | Removed in all three locations | Removed in all three locations |
| Removed canned reply dictionary entries | Removed entire unused response | Removed entire unused response |
| Removed constant citation label | Replaced by response source title | Replaced by response source title |
| Removed `updated` footer | Removed static date/data statement | Removed static date/data statement |
| Removed clubs question set | Removed all four prompts, including old club attribution | Removed all four prompts, including old club attribution |

- Details retains both hotline numbers (0943.482.840 / 0936.018.433).
- README now describes the active Next.js UI instead of the former iframe/legacy-site setup; full bilingual attribution, the responsible note, Club Match destination, presentation configuration and capability limitations replace outdated copy. The historical club spelling below is normalized without rewriting release history.
- Preference-storage comment now explains denied preference storage without retired product terminology.

### Files touched

- `app/design-tokens.css` — ombre palette and dark overrides.
- `app/dav.css` — text-size floor and removed obsolete label selectors.
- `app/ombre.css` — new v6 responsive presentation layer.
- `app/layout.tsx` — first-paint Light, root ombre selector, metadata and stylesheet import.
- `components/dav/header.tsx` — animated accessible trigger, reduced-motion header, external-link attributes; ecosystem component extracted.
- `components/dav/ecosystem-menu.tsx` — new ecosystem dialog/card component.
- `components/dav/primitives.tsx` — dialog origin, focus/close handling, mobile handle and pointer spotlights.
- `components/dav/topics.tsx` — direct external topic link and keyboard behavior.
- `components/dav/welcome.tsx` — linked feature 05, cycling headline, removed static update date.
- `components/dav/composer.tsx` — responsible disclaimer, Details attribution and removed mode label.
- `components/dav/messages.tsx` — removed mode badge, real source chips, Markdown table/link rendering.
- `components/dav/workspace.tsx` — Light default, translated document metadata, theme chrome, trigger state and removed mode label. No changes to history or chat/health logic.
- `lib/frontend/ecosystem.ts` — canonical URL and live external product.
- `lib/frontend/suggestions.ts` — clubs link in place of question set.
- `lib/frontend/i18n.ts` — string inventory above.
- `tests/frontend.test.ts` — topic/link, attribution, initial theme and live-product assertions; existing transport/history tests retained.
- `README.md`, `CHANGELOG.md` — documentation requested for v6.

### Validation and limits

- TypeScript check, all 13 regression tests and whitespace diff check passed after implementation. Tests cover bilingual key parity, nine prompt sets plus linked navigation slot, product ordering, retired UI wording, Light default, keyboard/scroll math, existing history/streaming boundaries and core text-token AA contrast.
- Final grep: zero retired-wording matches in presentation components, root app files, and UI configuration/dictionaries; zero incorrect club-spelling matches across searchable project files; zero explicit sub-13px font-size declarations. Frozen backend/history-adapter identifiers and historical/test references remain outside the UI-wording scope.
- `git diff --exit-code` confirmed no changes in `app/api`, `lib/db`, `lib/chatbot`, the three frontend transport/history adapters, or dependency manifests/lockfile.
- The running development service was reused and exposed in Preview.
- Browser navigation timed out, and the single diagnostic attempt also failed at the browser protocol layer. No usable page evidence was returned. Screenshots, the 360/768/1280/1920 viewport matrix, live link/theme/language/modal gestures, focus/animation behavior, chat persistence and Web Vitals remain unverified; no 60fps or end-to-end claim is made.
- Frozen routes, database, chat-provider modules, environment variables, API adapters and history-store implementation are not changed. Their development-provider identifiers/content and historical documentation/testing references are outside the presentation-only wording cleanup. If the existing provider configuration returns a development response, its content is not disguised or rewritten by the UI. Eliminating those backend-generated responses requires a separately authorized backend/configuration change.


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
- Added the experimental DAiTech disclaimer, hotline details, privacy guidance, local Vietnamese font subsets, first-paint theme restoration, accessible dialogs, and zoom support.

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
