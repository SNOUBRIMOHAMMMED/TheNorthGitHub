# Final landing release — 2026-09-20

- Approved N-shaped bridge image integrated into the hero with the man, crossing and distant destination visible.
- Obsidian/cyan visual system, Arabic RTL and English LTR, responsive desktop and mobile composition.
- Expanded productivity story, illustrative workspace, interactive goal/focus/habit/analytics panels, daily journey, supporting photography and six practical FAQs.
- Subtle scroll depth and reveal transitions, with reduced-motion handling and keyboard focus states.
- Primary signup calls to action open the existing account form directly.
- Mobile feature selectors use a balanced two-column layout; header controls have 44px touch targets.
- Build includes the new CSS, motion script and assets. Service-worker resources include the landing files.
- Clean source export preserves `scripts/` and `assets/`; Vercel output remains `dist` and Node major is pinned to 24.x.
- Corrected the new-database SQL bootstrap typo and declared its required revision column. No live migration was run.

Existing application feature logic and data formats were retained. The source project was not replaced, and no GitHub push or deployment was performed.
