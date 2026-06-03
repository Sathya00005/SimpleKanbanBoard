# Simple Kanban Board: Design System

This design system is derived from the provided `UI.jpg` reference and adapted for the Simple Kanban Board application. The design language emphasizes clean spacing, rounded geometries, soft background colors, and high-contrast typography.

## 1. Core Principles
*   **Ample Whitespace:** Use generous padding and margins. Let elements breathe.
*   **Soft & Friendly:** Utilize large border radii on structural elements (cards, modals) and pill shapes for interactive elements (buttons).
*   **Flat & Contrast-Driven:** Rely on solid, soft background colors rather than drop shadows to create hierarchy.
*   **Legibility:** Use a clean sans-serif typeface with distinct weight variations between headers and body copy.

## 2. Design Tokens

### 2.1. Color Palette
*   **Primary Background (Page Body):** `#FAFAFA` (Very Light Gray / Off-White)
*   **Surface Color (Cards, Modals):** `#FFFFFF` (Pure White)
*   **Soft Accent Surface (Columns, Highlighted Cards):** `#EAF1FB` (Light Icy Blue)
*   **Dark Surface (Dark Cards, Prominent Elements):** `#222222` (Dark Charcoal)
*   **Text - Primary (Headings, Main Body):** `#1A1A1A` (Almost Black)
*   **Text - Secondary (Descriptions, Subtitles):** `#666666` (Medium Gray)
*   **Text - On Dark:** `#FFFFFF` (White)
*   **Interactive / Accent:** `#222222` (Dark Charcoal for Primary Buttons)
*   **Borders/Dividers:** `#E5E7EB` (Light Gray)

### 2.2. Typography
*   **Font Family:** `Inter`, `Poppins`, or similar modern geometric sans-serif.
*   **Scale:**
    *   **H1 (Page Title):** 36px / 40px (Mobile), Semi-Bold, Line Height 1.2
    *   **H2 (Section/Modal Title):** 28px / 32px, Medium, Line Height 1.3
    *   **H3 (Column Title):** 18px / 20px, Medium, Line Height 1.4
    *   **Label (Overlines / Small Caps):** 12px, Semi-Bold, Uppercase, Letter Spacing 0.05em (Used for tags, statuses)
    *   **Body Base:** 16px, Regular, Line Height 1.5
    *   **Body Small:** 14px, Regular, Line Height 1.5 (Used for task descriptions, timestamps)

### 2.3. Spacing & Sizing
*   **Base Unit:** 8px (use multiples for padding/margins: 8, 16, 24, 32, 48, 64).
*   **Column Gap (Kanban Board):** 24px
*   **Card Padding (Task Card):** 20px
*   **Section Padding:** 48px to 64px

### 2.4. Border Radius
*   **Small (Inputs, Tags):** 8px
*   **Medium (Task Cards, Modals):** 24px
*   **Large (Columns/Containers):** 32px
*   **Pill (Buttons):** 9999px (Fully rounded)

---

## 3. UI Component Specifications

### 3.1. Buttons
*   **Primary Button:**
    *   Background: Dark Charcoal (`#222222`)
    *   Text: White (`#FFFFFF`), Medium Weight
    *   Padding: 12px 24px
    *   Border-Radius: 9999px (Pill)
    *   Hover State: Background shifts to `#000000` (Black)
*   **Secondary Button:**
    *   Background: Pure White (`#FFFFFF`) or Transparent
    *   Text: Dark Charcoal (`#222222`)
    *   Border: 1px solid `#E5E7EB`
    *   Padding: 12px 24px
    *   Border-Radius: 9999px (Pill)
    *   Hover State: Background shifts to `#F3F4F6`

### 3.2. Kanban Columns
*   **Background:** Light Icy Blue (`#EAF1FB`) or Off-White depending on board background.
*   **Padding:** 24px
*   **Border-Radius:** 32px
*   **Header:** H3 Typography, aligned left, with an optional task count badge.

### 3.3. Task Cards
*   **Background:** Pure White (`#FFFFFF`)
*   **Padding:** 20px
*   **Border-Radius:** 24px
*   **Drop Shadow:** Subtle (e.g., `0 4px 6px -1px rgba(0, 0, 0, 0.05)`) - optional, prioritize flat design.
*   **Content:**
    *   **Tag/Status:** Label Typography, padded, Pill border-radius.
    *   **Title:** Body Base (Semi-bold).
    *   **Description/Meta:** Body Small, Secondary Text Color.

### 3.4. Forms & Inputs (Modals)
*   **Input Fields:**
    *   Background: `#F9FAFB`
    *   Border: 1px solid `#E5E7EB`
    *   Padding: 16px
    *   Border-Radius: 12px (slightly softer than standard 8px to match theme)
    *   Text: Body Base
*   **Labels:** Body Small, Medium Weight, Primary Text Color.

### 3.5. Modals (Schedule, Deploy, Task Details)
*   **Overlay:** rgba(0,0,0,0.4) backdrop blur.
*   **Surface:** Pure White (`#FFFFFF`), Padding 40px, Border-Radius 32px.
*   **Action Bar:** Right-aligned Primary and Secondary buttons.

## 4. CSS Variables (Implementation Ready)

```css
:root {
  /* Colors */
  --color-bg-primary: #FAFAFA;
  --color-surface-white: #FFFFFF;
  --color-surface-blue: #EAF1FB;
  --color-surface-dark: #222222;

  --color-text-primary: #1A1A1A;
  --color-text-secondary: #666666;
  --color-text-inverse: #FFFFFF;

  --color-border: #E5E7EB;

  /* Typography */
  --font-family-base: 'Inter', system-ui, -apple-system, sans-serif;

  /* Spacing */
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;

  /* Border Radius */
  --radius-sm: 8px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-xl: 32px;
  --radius-pill: 9999px;
}
```