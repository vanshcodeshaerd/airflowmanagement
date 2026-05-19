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

const TITLE = "Airport & Airline Management System - Flight Booking & Passenger Management Platform";
const DESC =
  "Manage your flights, book tickets, store passenger information, and access boarding passes all in one platform. Simple, fast, and secure airport & airline management.";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      {
        name: "keywords",
        content:
          "airport management, airline management, flight booking, passenger management, boarding pass, flight information, travel platform, airline system, airport system, flight management platform",
      },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
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
