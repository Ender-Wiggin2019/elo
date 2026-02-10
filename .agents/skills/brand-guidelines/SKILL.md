---
name: brand-guidelines
description: Brand design system for Terraforming Mars (TFM). Use when building or styling any frontend page/component in this project. Defines the visual language — colors, typography, spacing, component patterns — for a dark sci-fi Mars colonization theme.
---

# TFM Brand Guidelines

## Aesthetic Direction

**Retro-futuristic Mars colonization** — the feeling of a NASA mission control room overlooking the red Martian surface. Dark, atmospheric, industrial yet refined. Think: warm dust and cold stars.

## Color Palette

All colors are defined as Tailwind CSS custom values in `tailwind.config.js` under `theme.extend.colors.mars`.

### Core Palette

| Token              | Value       | Usage                                     |
|--------------------|-------------|-------------------------------------------|
| `mars-void`        | `#0b0f1a`   | Deepest background (page body)            |
| `mars-deep`        | `#111827`   | Card / panel background                   |
| `mars-surface`     | `#1a2234`   | Elevated surfaces, hover states           |
| `mars-border`      | `#263049`   | Borders, dividers, subtle lines           |

### Accent Colors

| Token              | Value       | Usage                                     |
|--------------------|-------------|-------------------------------------------|
| `mars-rust`        | `#c2410c`   | Primary accent — Mars surface orange      |
| `mars-amber`       | `#d97706`   | Warm highlight — gold/amber actions       |
| `mars-ember`       | `#ea580c`   | Hover state for primary accent            |
| `mars-sand`        | `#a3764f`   | Muted warm tone — tags, secondary info    |

### Functional Colors

| Token              | Value       | Usage                                     |
|--------------------|-------------|-------------------------------------------|
| `mars-cyan`        | `#06b6d4`   | Technology / info — links, data highlights|
| `mars-teal`        | `#14b8a6`   | Success / positive state                  |
| `mars-red`         | `#dc2626`   | Error / destructive actions               |
| `mars-yellow`      | `#eab308`   | Warning / confirming state                |

### Text Hierarchy

| Token              | Value       | Usage                                     |
|--------------------|-------------|-------------------------------------------|
| `mars-text`        | `#e2e8f0`   | Primary body text                         |
| `mars-text-dim`    | `#94a3b8`   | Secondary / muted text                    |
| `mars-text-faint`  | `#64748b`   | Tertiary / disabled text                  |

## Typography

- **Font Family**: `Ubuntu, sans-serif` (consistent with existing game UI)
- **Headings**: Bold, uppercase tracking-wide where appropriate
- **Body**: Regular weight, comfortable line-height (1.5–1.6)
- **Data/Counts**: Mono or semi-bold for numerical emphasis

## Component Patterns

### Cards (Room / Panel)
```
bg: mars-deep
border: 1px solid mars-border
border-radius: 12px (rounded-xl)
shadow: subtle dark shadow (shadow-lg shadow-black/30)
hover: border-mars-rust/40
```

### Buttons
- **Primary**: `bg-mars-rust hover:bg-mars-ember text-white` — main CTA
- **Secondary**: `bg-mars-surface hover:bg-mars-border text-mars-text` — neutral action
- **Success**: `bg-mars-teal/20 hover:bg-mars-teal/30 text-mars-teal` — join / confirm
- **Danger**: `bg-mars-red/20 hover:bg-mars-red/30 text-mars-red` — kick / close
- **All buttons**: `rounded-lg px-4 py-2 font-medium transition-colors`

### Badges / Tags
- **Setting tag**: `bg-mars-surface text-mars-sand rounded-full px-2.5 py-0.5 text-xs font-medium`
- **Status badge**: colored per status (see Functional Colors), rounded, uppercase, tiny

### Player Slots
- Filled: Use existing `player_translucent_bg_color_*` classes + rounded-lg
- Empty: `border border-dashed border-mars-border text-mars-text-faint rounded-lg`

## Atmosphere Effects

- Subtle gradient overlays on page background (radial from top-center, warm rust fade)
- Very faint noise/grain texture on hero areas (optional, via CSS)
- Glow effects on primary buttons: `shadow-mars-rust/20`

## Spacing Scale

Follow Tailwind defaults. Prefer generous padding on cards (px-4 py-3 or px-5 py-4) and compact inner elements.

## Responsive Breakpoints

- Mobile-first design
- Cards: single column on mobile, 2-column grid on `lg:`
- Header controls: wrap on small screens (`flex-wrap`)
