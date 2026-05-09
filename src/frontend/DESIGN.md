---
name: Legacy Calendar
description: A premium, private friend-group calendar for deep-night coordination.
colors:
  primary: "#3b82f6"
  surface-0: "#ffffff"
  surface-950: "#000000"
  neutral-text: "#ffffff"
  neutral-muted: "#a3a3a3"
  border: "#262626"
typography:
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "16px"
    lineHeight: "1.5"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface-950}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  dialog:
    backgroundColor: "{colors.surface-950}"
    rounded: "{rounded.lg}"
    border: "{colors.border}"
---

# Design System: Legacy Calendar

## 1. Overview

**Creative North Star: "Obsidian Focus"**

Legacy Calendar is an uncompromisingly dark, high-utility tool designed for intimate friend groups. It rejects the generic "SaaS cream" aesthetic in favor of a deep-night, high-contrast palette optimized for OLED displays. The design is quiet but confident, prioritizing density and precision over decorative fluff.

**Key Characteristics:**
- **Pure Black Foundation**: Backgrounds are absolute `#000000` (OLED black) to minimize light bleed and maximize focus.
- **Atmospheric Utility**: Every element serves the task of coordination. Color is used sparingly as a structural guide or a status signal.
- **Tactile Softness**: Despite the hard-edged theme, interactions use large radii (`rounded-2xl`) to provide a sense of approachability and intimacy.

## 2. Colors

The palette is monochrome-forward, using an OLED-optimized scale that anchors on absolute black.

### Primary
- **Focus Blue** (#3b82f6): Used for primary actions, active states, and focus indicators. Its rarity makes it a powerful navigational cue.

### Neutral
- **OLED Black** (#000000): The canonical background for all root surfaces.
- **Deep Slate** (#0a0a0a): Used for tonal layering on elevated containers (toasts, cards).
- **Steel Border** (#262626): The primary structural color for hair-line borders and dividers.
- **High-Key White** (#ffffff): Reserved for high-contrast primary text.
- **Muted Gray** (#a3a3a3): Used for secondary labels and metadata.

### Named Rules
**The Void Rule.** Backgrounds must be absolute `#000000`. Lighter "dark mode" grays are prohibited for root surfaces.

## 3. Typography

**Display Font:** Outfit
**Body Font:** Inter (with system-ui fallback)

**Rationale:**
The pairing of **Outfit** and **Inter** creates a distinct typographic hierarchy. **Outfit** provides a geometric, premium character for headings and titles, while **Inter** ensures exceptional readability for body text and data-dense views.

### Hierarchy
- **Display** (800, Outfit): Large page headers and brand moments.
- **Headline** (700, Outfit): Section titles and dialog headers.
- **Body** (400, Inter): The primary reading weight. Max line length capped at 70ch.
- **Label** (600, Inter): Metadata, status pills, and small buttons.


## 4. Elevation

In an OLED theme, shadows are secondary to contrast and borders.

### Shadow Vocabulary
- **Structural Glow** (`0 10px 30px -10px rgba(0, 0, 0, 0.5)`): Used on toasts and dialogs to lift them off the base void.

### Named Rules
**The Border-First Rule.** Depth is primarily conveyed via subtle `#262626` borders. Tonal layering (`#0a0a0a`) is used only when a surface needs to feel distinct from the background void.

## 5. Components

### Buttons
- **Shape:** Softly rectangular (`rounded-xl` / 12px).
- **Style:** High-contrast backgrounds or transparent with structural borders.
- **Hover:** Subtle scale or brightness shift; no aggressive color changes.

### Dialogs
- **Corner Style:** Large radius (`rounded-2xl` / 16px).
- **Background:** `bg-zinc-950` (#0a0a0a) to provide tonal separation from the background.
- **Border:** `border-zinc-800` (#262626) structural stroke.

### Status Pills
- **Style:** Subtle background tints with 1px borders. Rounded-full for a distinct shape.

## 6. Do's and Don'ts

### Do:
- **Do** use absolute `#000000` for the page background.
- **Do** use `rounded-2xl` for large overlays and `rounded-xl` for interactive elements.
- **Do** maintain high contrast ratios (minimum 7:1) for primary text.

### Don't:
- **Don't** use Light Mode. No blinding whites or high-key interfaces.
- **Don't** use generic SaaS "dashboard-cream" or overly corporate layouts.
- **Don't** use thick colored borders as accents.
