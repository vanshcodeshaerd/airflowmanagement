# AirFlow Management — Landing Page Plan

A single-route landing page (`/`) built with the existing TanStack Start + Tailwind stack. All content static. SEO via route `head()`. Animations via Framer Motion. Carousels via Swiper.

## Scope
- One page only (`src/routes/index.tsx`) — no auth, backend, or extra routes.
- All copy/images live in `src/data/landingPageContent.ts`.
- Hero + feature/testimonial carousels + stats counter + 6-image gallery with lightbox + footer.

## Design system (src/styles.css)
Add semantic tokens in oklch matching the spec palette:
- `--primary` = navy `#003580`, `--primary-deep` = `#001f3f`
- `--accent` = teal `#0099d8`, `--accent-strong` = `#0066cc`
- `--warning` = `#ff7300`, `--success` = `#28a745`
- `--sky-soft` = `#e6f2ff`, neutrals for bg/border/muted text
- Register each in `@theme inline` so Tailwind utilities like `bg-primary`, `text-accent`, `bg-sky-soft` work.
- Import Google Fonts (Poppins, Inter, Playfair Display) via `@import url(...)` at top of `styles.css`.
- Add font-family CSS vars + Tailwind theme entries: `font-display` (Playfair), `font-sans` (Inter), `font-ui` (Poppins).
- Global rule: buttons have `border-radius: 0` (square) — enforced via component classes, not a global reset.

## Dependencies to add
- `framer-motion`
- `swiper`
(`lucide-react` already available.)

## Files to create

```
src/data/landingPageContent.ts        // all copy, stats, testimonials, gallery, feature list
src/components/landing/Header.tsx
src/components/landing/HeroSection.tsx
src/components/landing/FeaturesCarousel.tsx
src/components/landing/WhatWeDoSection.tsx
src/components/landing/StatisticsSection.tsx
src/components/landing/GallerySection.tsx
src/components/landing/ImageModal.tsx
src/components/landing/TestimonialsCarousel.tsx
src/components/landing/CTASection.tsx
src/components/landing/Footer.tsx
src/components/landing/SquareButton.tsx  // shared primary/outline square button
```

`src/routes/index.tsx` replaces the placeholder, composes the sections in order, and sets `head()` with title, description, keywords, og/twitter tags, and a `WebApplication` JSON-LD script.

## Section-by-section build notes

1. **Header** — sticky, white, 70px, shadow. Logo (Plane icon + "AirFlow Management" Playfair 24px navy). Desktop nav links (Home/Features/About/Contact, in-page hash scroll for now). Right: square teal "Get Started" button. Mobile: Lucide `Menu` hamburger toggling a slide-down panel.

2. **Hero** — 2-col grid on `md+`, stacked on mobile. Left: airport/airplane image with continuous y-axis float (`animate={{ y: [0,-20,0] }}`, 3s infinite). Right: H1 (Playfair 52px), italic teal tagline, gray subtitle, two stacked square CTAs ("Explore Platform" filled, "Learn More" outline), trust line. Staggered fade/slide-in on mount.

3. **FeaturesCarousel** — Swiper, autoplay 5s, loop, `slidesPerView: 1 / 2 / 3` at breakpoints, custom prev/next using `ChevronLeft/Right`, teal pagination dots. 6 square cards (image 80px tall cover, Poppins title, Inter description).

4. **WhatWeDo** — gray `#f5f5f5` bg, 3 white cards with 4px left teal border, Lucide icons (`Users`, `Plane`, `FileText`). Each card uses `whileInView` slide-up with staggered delays.

5. **Statistics** — navy gradient bg, 4 cols. Each stat uses a `useMotionValue` + `useTransform` + `animate()` count-up triggered by `useInView`. Format: "2.5M+", "1,250+", "98%", "24/7" (special-case non-numeric ones to skip animation or animate the numeric part only — "24/7" rendered statically).

6. **Gallery** — 3×2 grid on desktop, square images 280×200 cover, hover scale 1.05 with teal overlay. Click opens `ImageModal`.

7. **ImageModal** — `AnimatePresence` lightbox: dark backdrop fade, scaled-in content, prev/next arrows, close X, keyboard arrow/Esc support, body scroll lock while open.

8. **TestimonialsCarousel** — Swiper autoplay 6s, fade transition, 3 cards on desktop / 1 on mobile. Star rating using filled Lucide `Star` in `#ffc107`. Square cards, light gray section bg.

9. **CTASection** — navy gradient, centered Playfair tagline, subtitle, single large square teal CTA with bounce-in, trust line. `whileInView` fade-up.

10. **Footer** — `#1a1a1a` bg, 4 cols (About + socials, Product, Company, Legal), divider, copyright. Hash/`#` placeholder links since no other routes exist.

## Images
Use Unsplash hotlinks (airport/airline themed) for hero, carousel, and gallery — keeps the change UI-only and avoids generation latency. All images have descriptive `alt` attributes and `loading="lazy"` except the hero (eager).

## SEO (route `head()`)
- title, description, keywords (as meta), author
- og:title/description/type=website/url=/
- twitter:card=summary_large_image
- canonical `/`
- JSON-LD `WebApplication` script (name, description, applicationCategory: TravelApplication)

## Responsiveness
Tailwind breakpoints `sm/md/lg` mirroring the spec: 1 col → 2 col → 3–4 col. Hero H1 scales `text-4xl md:text-5xl lg:text-[52px]`. Buttons full-width on mobile.

## Technical details
- Square buttons: shared `SquareButton` component with `variant: "primary" | "outline"`, no `rounded-*` class, hover translate-y + shadow via Tailwind.
- Framer Motion: import from `framer-motion`; use `motion.div`, `whileInView={{ ... }} viewport={{ once: true, amount: 0.2 }}` pattern across sections to avoid re-trigger jank.
- Swiper: import `swiper/react` + required modules (`Autoplay`, `Navigation`, `Pagination`, `EffectFade`), plus base CSS in the component files.
- Count-up: gate with `useInView({ once: true })`, use `animate(motionValue, target, { duration: 2 })` and format via `useTransform` for "M+" / "K+" / "%".
- Index page replaces the existing `PlaceholderIndex` entirely (removes the `data-lovable-blank-page-placeholder` marker).

## Out of scope
Auth, routing to other pages, real backend, payments, i18n, dark mode. Nav links and footer links resolve to `#` anchors for now.
