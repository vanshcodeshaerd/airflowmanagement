import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/landing/Header";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesCarousel } from "@/components/landing/FeaturesCarousel";
import { WhatWeDoSection } from "@/components/landing/WhatWeDoSection";
import { StatisticsSection } from "@/components/landing/StatisticsSection";
import { GallerySection } from "@/components/landing/GallerySection";
import { TestimonialsCarousel } from "@/components/landing/TestimonialsCarousel";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";

const TITLE =
  "Airport & Airline Management System | Flight Booking & Passenger Management Platform";
const DESC =
  "All-in-one airport and airline management platform to book flights, manage passenger information, store boarding passes, and track real-time flight status. Secure, fast and trusted by travelers worldwide.";
const KEYWORDS = [
  "airport management system",
  "airline management system",
  "flight booking platform",
  "online flight booking",
  "passenger management software",
  "boarding pass storage",
  "digital boarding pass",
  "flight information system",
  "travel management platform",
  "airline reservation system",
  "airport operations software",
  "flight status tracker",
  "manage flight bookings",
  "travel document storage",
  "frequent flyer management",
  "business travel platform",
].join(", ");

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "keywords", content: KEYWORDS },
      { name: "author", content: "AirFlow Management" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
      { name: "googlebot", content: "index, follow" },
      { name: "rating", content: "general" },
      { name: "revisit-after", content: "7 days" },
      { name: "theme-color", content: "#003580" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { property: "og:site_name", content: "AirFlow Management" },
      { property: "og:locale", content: "en_US" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "AirFlow Management",
          description: DESC,
          applicationCategory: "TravelApplication",
          operatingSystem: "Web",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.9",
            ratingCount: "2500",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "AirFlow Management",
          description:
            "Airport and airline management platform for passengers and travel professionals.",
          sameAs: [],
        }),
      },
    ],
  }),
});

function Index() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <FeaturesCarousel />
        <WhatWeDoSection />
        <StatisticsSection />
        <GallerySection />
        <TestimonialsCarousel />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
