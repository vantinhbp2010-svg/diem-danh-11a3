# Design System — Điểm danh 11A3

## 1. Brand identity

- App name: Điểm danh 11A3 — THPT Bình Long
- Mood/Atmosphere: Học đường hiện đại — tin cậy, thân thiện, nhưng chuyên nghiệp
- Overall feel: Sáng sủa, không chói mắt, dễ đọc trên mọi thiết bị

## 2. Color palette

```css
:root {
  /* Primary — Xanh dương đậm */
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-500: #2563eb;
  --color-primary-600: #1d4ed8;
  --color-primary-700: #1e40af;

  /* Accent — Tím nhấn */
  --color-accent-500: #7c3aed;
  --color-accent-600: #6d28d9;

  /* Semantic */
  --color-success: #059669;
  --color-success-light: #ecfdf5;
  --color-warning: #d97706;
  --color-warning-light: #fffbeb;
  --color-danger: #dc2626;
  --color-danger-light: #fef2f2;

  /* Neutral */
  --color-bg: #f8fafc;
  --color-surface: #ffffff;
  --color-border: #e2e8f0;
  --color-text: #0f172a;
  --color-text-secondary: #64748b;
  --color-text-muted: #94a3b8;
}
```

## 3. Typography

- Font primary: Be Vietnam Pro (Google Fonts)
- Font mono: JetBrains Mono
- Scale: 12px / 13px / 14px / 16px / 18px / 22px / 28px / 36px
- Line-height: 1.5 for body, 1.2 for headings

## 4. Spacing system

Base unit: 4px

Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64

## 5. Border radius

- sm: 6px
- md: 10px
- lg: 14px
- xl: 18px
- pill: 9999px

## 6. Shadow system

```css
--shadow-xs: 0 1px 2px rgba(15, 23, 42, 0.04);
--shadow-sm: 0 1px 3px rgba(15, 23, 42, 0.06);
--shadow-md: 0 4px 12px -2px rgba(15, 23, 42, 0.08);
--shadow-lg: 0 12px 24px -6px rgba(15, 23, 42, 0.12);
--shadow-xl: 0 24px 48px -12px rgba(15, 23, 42, 0.18);
```

## 7. Component specs

- Button: primary fill #2563eb, hover #1d4ed8, radius 10px, padding 10px 18px
- Input: border 1px #e2e8f0, focus ring 3px rgba(37, 99, 235, 0.15)
- Card: white background, border 1px, radius 14px, shadow-sm
- Table: header background #f1f5f9, row hover #f8fafc, row height approx. 48px

## 8. UI/UX redesign requirements

### 8.1 Layout overview

- Desktop (>1024px): container max-width 1200px, centered, padding 32px
- Tablet (768-1024px): container padding 24px
- Mobile (<768px): full width, padding 16px, stacked sections

### 8.2 Header

- Logo + nama lớp on the left with gradient text from #1e40af → #7c3aed
- Class selector + Trang khách + Đăng xuất on the right
- Sticky top with backdrop blur when scrolling

### 8.3 Tab navigation

- Use pill tabs with background #f1f5f9
- Active tab uses white background and subtle shadow
- Smooth slide transitions between tabs
- Mobile: allow horizontal scrolling if needed

### 8.4 Attendance tab

- Status banner shows current period in a gradient background
- Stats cards: đúng giờ / đi trễ / vắng
- Table rows color coded by status
- Actions include quick attendance buttons and edit/delete controls

### 8.5 Camera AI tab

- Video preview with gradient border
- Live detection log panel alongside
- Start/Stop buttons with pulse animation

### 8.6 News tab

- News cards with accent border left
- Lightbox modal for image preview
- Form for posting news with image upload

### 8.7 Competition tab

- Big score values with gradient text
- Top 5 cards with color-coded borders
- Progress bars for category ranking

### 8.8 Settings tab

- Grid of action buttons
- Information panel with hover effect

### 8.9 Login page

- Split layout with left gradient intro and right form
- Floating logo animation and smooth fade-in form
- Mobile stacked layout

## 9. Motion design

- Micro-interactions: 150-300ms durations
- Page transitions: 400-600ms
- Easing: cubic-bezier(0.4, 0, 0.2, 1)
- Respect reduced-motion preferences

## 10. Accessibility

- Contrast ratio ≥ 4.5:1 for normal text and ≥ 3:1 for large text
- Focus visible: outline 2px #2563eb with offset 2px
- Use aria-labels for icon buttons
- Ensure full keyboard navigation

## 11. Deployment

### Firebase rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### Cloudflare Pages configuration

```toml
name = "diem-danh-11a3"
compatibility_date = "2024-01-01"
pages_build_output_dir = "dist"
```

### SPA redirect rule

```text
/* /index.html 200
```

### GitHub Actions deployment example

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    name: Deploy to Cloudflare Pages
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: diem-danh-11a3
          directory: dist
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

## 12. Implementation notes

- Use a modern, calm blue-violet palette with high readability.
- Keep key actions obvious and consistent across tabs.
- Prioritize mobile correctness and accessibility.
- Preserve existing app functionality while improving clarity, hierarchy, and visual polish.
