# Landing design QA — 2026-09-20

final result: passed

Scope: final public landing page, Arabic/English, unauthenticated state. This is not certification of the live Supabase deployment or every signed-in application screen.

## Visual truth and evidence

- Approved bridge source: `assets/north-bridge.png`, 1659 × 948. Original source: `C:/Users/pc/.codex/generated_images/01a08618-3f02-74e0-9cba-79b567f4ef68/exec-92361136-6369-40a0-98b1-9becb24fa62a.png`.
- Earlier selected page direction: `C:/Users/pc/.codex/generated_images/01a08618-3f02-74e0-9cba-79b567f4ef68/exec-f274735a-b495-4f2c-9b29-431f5a0f4c6b.png`. The later approved bridge, longer story, editorial photos and realistic FAQs intentionally supersede that shorter concept.
- Final exported application: http://127.0.0.1:4203/ . Working visual copy checked at port 4202.
- Screenshot directory: `C:/Users/pc/Documents/Codex/2026-09-09/let-s-set-up-a-scheduled-2/outputs/TheNorth-QA/`.
- Desktop evidence: `final-export-desktop.jpg`, `desktop-hero-ar.jpg`, `desktop-hero-en.jpg`, `desktop-clarity-ar.jpg`, `desktop-faq-en.jpg`, `desktop-footer-ar.jpg`.
- Mobile evidence: `mobile-hero-ar.jpg`, `mobile-hero-en.jpg`, `mobile-preview-ar.jpg`, `mobile-features-ar.jpg`, `mobile-review-ar.jpg`.

CSS viewports were 1280 × 900 and 390 × 844. The browser provider returned JPEG captures of 1265 × 877–889 and 375 × 812 respectively; comparisons account for the provider's viewport capture bounds and are not pixel-diff claims. The bridge is a content asset rather than a complete page screenshot: its composition was compared with the visible hero region, not with unrelated page chrome. Source and implementation were opened together in the same comparison input. The earlier full-page concept and current desktop/mobile captures were also viewed together.

## Findings and comparison history

- Resolved P2: mobile feature selectors initially wrapped three on one row and one on the next. They now form a balanced two-column grid with 44px minimum button height. Rechecked in `mobile-features-ar.jpg`; all four labels and the selected state are clear.
- Hero composition passed: the same approved bridge asset is used, with the man, complete crossing and distant illuminated destination visible. Desktop copy occupies the dark right side. On mobile the uncropped image sits above the copy rather than being cropped behind it. The larger desktop hero and mobile stacking are intentional adaptations to the newly approved image.
- No remaining actionable P0/P1/P2 issues were found in the inspected landing states.

## Required surfaces

1. **Typography:** Arabic RTL and English LTR headlines, paragraphs, controls and FAQ text were inspected. System-font fallbacks are intentional; the image concept's precise font is not claimed as a match. Line spacing and heading hierarchy remain readable. No clipped headline or broken control text was observed.
2. **Spacing/layout:** desktop split hero, section grids, product preview, feature panels, mobile stacking and footer were inspected. DOM checks found no horizontal viewport overflow. The mobile navigation grid was corrected as above.
3. **Color:** dark obsidian surfaces, restrained cyan actions, chalk-white headlines and the orange bridge destination preserve the approved visual direction. Subtle dark overlays protect hero text readability. Selected controls and keyboard focus are visibly distinct.
4. **Imagery:** approved bridge and both supporting images load at their native dimensions. Desktop and mobile framing keeps the intended subjects visible. Lazy loading is used for supporting photographs. Focused hero and editorial captures were inspected in addition to the page-level composition.
5. **Copy/content:** both languages explain goals, focused work, measurement, habits, finances and review. Six FAQs answer practical objections and disclose local active-timer behavior. Product examples are labelled as illustrative; there are no invented customer counts or testimonials.

## Interaction checks

- Language switch updates visible text and direction.
- Main Start free action opens the existing Create account form directly; Back restores the landing page. No credentials were submitted.
- All four feature controls select exactly one visible panel; mobile selection was also checked.
- FAQ navigation and native disclosure expansion work; the session-persistence answer was inspected expanded.
- Scroll depth/reveals were visually observed. Reduced-motion branches and CSS were inspected; OS-level reduced-motion emulation was not performed.
- Header and feature touch targets were refined; visible keyboard focus was checked.
- All landing images reported loaded. Browser console inspection captured no warning/error entries for the tested landing flows.

## Export/build validation

Executed inside `outputs/TheNorth-Final` using Node.js 24.15.0:

- `npm ci --ignore-scripts --offline`: passed; no external npm dependencies.
- `npm run lint`: passed syntax, IDs, linked assets and manifest checks.
- `npm test`: 43 passed, 0 failed.
- `npm run build`: passed, generating `dist`.
- Production files were compared byte-for-byte to the exported source files.
- Required build scripts and image folders are retained; private-key pattern and forbidden-file scans returned no matches. The existing Supabase publishable key is intentionally public configuration.

## Remaining limits

Real account creation, email delivery, live RLS, cross-device sync, deployed hosting and physical-device Safari were not exercised. Existing authentication/cloud unit tests use mocks. No production data was changed. Native font rendering can vary by OS; optional font self-hosting is future polish, not a blocker for this landing release.

Implementation checklist: approved artwork integrated; responsive layout checked; feature controls and signup entry verified; mobile tabs refined; export build/tests passed; clean archive prepared separately.
