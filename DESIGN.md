# Design

GreenQuote uses the Cloover design system, taken from www.cloover.com on
13 Nov 2026. The browsable version, with live previews:
https://claude.ai/artifact/4zVGrpbfAmXBjdRT4mbDfq. This file is the copy the
code follows. Values marked _derived_ were not on the site and follow its
patterns.

## Principles

- **White ground, one blue.** White pages, black text. Cloover blue
  (`#002EFF`) is the only strong colour: the logo mark and the one main action
  per view.
- **Grey panels, not boxes.** Group content on flat `#F2F2F2` panels with
  24px corners. White cards with a shadow are for floating things and for
  choices, such as the three instalment offers.
- **Pills.** Buttons and badges are fully rounded. Inputs and dialogs use
  8px / 12px corners.
- **DM Sans throughout.** Headings at weight 500, labels at 600.
- **German first.** Short noun-phrase headlines ("Für Hausbesitzer"); actions
  as infinitives ("Angebot anfragen"); German number format with the unit
  (`485.000 €`, `4,9 %`, `9,8 kWp`). No exclamation marks, no emoji.

## Colour

| Token                       | Value                         | Use                                                                             |
| --------------------------- | ----------------------------- | ------------------------------------------------------------------------------- |
| `brand-blue`                | `#002EFF`                     | Primary button, logo mark, selected state. White text 7.4:1.                    |
| `action-blue`               | `#1A6AFF`                     | Links, secondary button border and text, primary hover.                         |
| `blue-200`                  | `#95B9FF`                     | Chart series, decorative fills. Never text.                                     |
| `blue-100`                  | `#DCE8FF`                     | Selected offer, info background.                                                |
| `ink`                       | `#000000`                     | Headings and body text.                                                         |
| `ink-soft`                  | `#333333`                     | Form labels, dialog text.                                                       |
| `ink-muted`                 | `#6E6E6E`                     | Helper text, captions, input borders (5.1:1 on white).                          |
| `navy`                      | `#0E0E2C`                     | Dark sections.                                                                  |
| `surface`                   | `#FFFFFF`                     | Page and card background.                                                       |
| `surface-subtle`            | `#F2F2F2`                     | Grey panels, table headers.                                                     |
| `line`                      | `#C2C2C2`                     | Hairline dividers, disabled fill.                                               |
| `focus`                     | `#2563EB`                     | Focus ring, 2px.                                                                |
| `green-700`                 | `#39641D`                     | _Derived:_ success / low risk band text, on `green-100` `#F3F8F0`.              |
| `orange-700`                | `#C94001`                     | _Derived:_ warning / high risk band text and errors, on `orange-100` `#FFE9DF`. |
| `green-500` `teal` `indigo` | `#56D919` `#3EC18F` `#6366F1` | Extra chart series. Never text.                                                 |

Always pair a status colour with a word; colour alone never carries meaning.

## Type

DM Sans from Google Fonts (`next/font/google`, weights 400, 500, 600, 700).

| Style     | Size / line height | Weight | Use                                     |
| --------- | ------------------ | ------ | --------------------------------------- |
| `display` | 56 / 62, −0.02em   | 500    | Hero headline, once per page.           |
| `h1`      | 47 / 56, −0.01em   | 500    | Section titles.                         |
| `h2`      | 35 / 44            | 500    | Page titles in the app.                 |
| `h3`      | 27 / 36            | 500    | Card titles.                            |
| `h4`      | 20 / 28            | 600    | Small headings, dialog titles.          |
| `body-l`  | 20 / 32            | 400    | Lead paragraph.                         |
| `body`    | 16 / 26            | 400    | Running text.                           |
| `body-s`  | 15 / 21            | 400    | Card descriptions, table cells.         |
| `label`   | 14 / 22            | 600    | Buttons, form labels.                   |
| `caption` | 12 / 17            | 400    | Footnotes, chart axes.                  |
| `figure`  | 32 / 36            | 600    | Prices and instalments, `tabular-nums`. |

## Spacing, radius, shadow

- Spacing: 4px base. Card padding 24px, gap between cards 32px, between page
  sections 96px, minimum page gutter 16px.
- Radius: `sm` 8px (inputs), `md` 12px (cards, dialogs), `lg` 24px (grey
  panels), `pill` 999px (buttons, badges).
- Shadow: `0 24px 64px rgba(0,0,0,.12), 0 2px 8px rgba(0,0,0,.06)` on
  floating cards and dialogs only.

## shadcn/ui theme

Paste into `apps/web` `globals.css` when the app is scaffolded. Light only:
cloover.com has no dark theme.

```css
:root {
  --background: #ffffff;
  --foreground: #000000;
  --card: #ffffff;
  --card-foreground: #000000;
  --popover: #ffffff;
  --popover-foreground: #000000;
  --primary: #002eff;
  --primary-foreground: #ffffff;
  --secondary: #ffffff;
  --secondary-foreground: #1a6aff;
  --muted: #f2f2f2;
  --muted-foreground: #6e6e6e;
  --accent: #dce8ff;
  --accent-foreground: #002eff;
  --destructive: #c94001;
  --border: #c2c2c2;
  --input: #6e6e6e;
  --ring: #2563eb;
  --radius: 0.75rem;
  --chart-1: #002eff;
  --chart-2: #95b9ff;
  --chart-3: #56d919;
  --chart-4: #3ec18f;
  --chart-5: #6366f1;
}
```

Button: override the shadcn default to `rounded-full`, `h-12 px-6`; the
`secondary` variant gets a `border border-[--secondary-foreground]`.

## Components

- **Button:** pill. Primary = brand blue; secondary = white with action-blue
  border and text. One primary per view.
- **Card:** grey panel (`bg-muted rounded-3xl p-6`) by default; white card
  with the shadow for offers. The chosen offer: `bg-accent` and a brand-blue
  border.
- **Input:** label above, ink-muted border, 8px corners, hint below; errors via
  `aria-invalid` and an orange-700 message saying how to fix it.
- **Badge:** pill, word plus colour: risk band "Geringes Risiko" (green),
  "Hohes Risiko" (orange), info (blue).
- **Step form:** one short question per screen (`StepForm` in `apps/web`), for
  Register and Request a quote; Sign in stays one screen. "Step 2 of 3" above
  the fields; a secondary "Back" and a primary "Next" below, the last step's
  button naming the action ("Create account"). Enter goes to the next step,
  focus moves to the step's first input, and the browser Back goes to the
  previous step (`?step=<id>`). Values stay in memory. On desktop a sticky grey
  "Preview" panel sits beside the step, below it on mobile. The panel appears
  only once it has something to show; until then the step takes the full
  width. A slider shows its minimum and maximum under it.

## Logos

`docs/design/`: `cloover-logo.svg` (light grounds), `cloover-logo-white.svg`
(dark grounds), `cloover-mark.svg` (favicon, tight spaces). Copy into
`apps/web/public/` when needed. Don't recolour the mark.
