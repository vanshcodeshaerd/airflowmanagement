export const features = [
  {
    title: "Passenger Management",
    description: "Store, edit and organize passenger details with ease.",
    image: "https://images.unsplash.com/photo-1556388158-158ea5ccacbd?w=600&q=80",
  },
  {
    title: "Flight Information",
    description: "Real-time schedules, gates and status across airlines.",
    image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&q=80",
  },
  {
    title: "Booking Management",
    description: "Search, compare and manage every booking in one place.",
    image: "https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=600&q=80",
  },
  {
    title: "Boarding Pass Storage",
    description: "Keep digital boarding passes ready and accessible.",
    image: "https://images.unsplash.com/photo-1583416750470-965b2707b355?w=600&q=80",
  },
  {
    title: "Real-time Updates",
    description: "Instant notifications for delays, gates and changes.",
    image: "https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=600&q=80",
  },
  {
    title: "Document Control",
    description: "Securely store passports, visas and travel documents.",
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&q=80",
  },
];

export const stats = [
  { value: 2500000, display: (n: number) => `${(n / 1_000_000).toFixed(1)}M+`, label: "Passengers Managed", icon: "Users" as const },
  { value: 1250, display: (n: number) => `${Math.round(n).toLocaleString()}+`, label: "Airlines Integrated", icon: "Plane" as const },
  { value: 98, display: (n: number) => `${Math.round(n)}%`, label: "User Satisfaction", icon: "Star" as const },
  { value: 0, display: () => "24/7", label: "Customer Support", icon: "Headphones" as const, static: true },
];

export const gallery = [
  { src: "https://images.unsplash.com/photo-1542296332-2e4473faf563?w=1200&q=80", alt: "Passenger walking through modern airport terminal" },
  { src: "https://images.unsplash.com/photo-1583500178690-f7eb39f6dba6?w=1200&q=80", alt: "Flight information display board" },
  { src: "https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=1200&q=80", alt: "Booking confirmation interface" },
  { src: "https://images.unsplash.com/photo-1521727857535-28d2047314ac?w=1200&q=80", alt: "Digital boarding pass on a phone" },
  { src: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&q=80", alt: "Airplane wing above clouds" },
  { src: "https://images.unsplash.com/photo-1540339832862-474599807836?w=1200&q=80", alt: "Pilot in modern cockpit" },
];

export const testimonials = [
  {
    quote: "This platform has revolutionized how I manage my travel documents. Everything is organized and accessible in seconds!",
    name: "Priya Sharma",
    title: "Frequent Traveler",
    avatar: "https://i.pravatar.cc/80?img=47",
  },
  {
    quote: "As a travel agent, this system simplifies client management. I can store and update passenger information instantly.",
    name: "Rajesh Kumar",
    title: "Travel Agent",
    avatar: "https://i.pravatar.cc/80?img=12",
  },
  {
    quote: "The boarding pass storage feature is a game-changer. No more searching through emails!",
    name: "Anjali Singh",
    title: "Business Traveler",
    avatar: "https://i.pravatar.cc/80?img=45",
  },
];

export const heroImage =
  "https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=1200&q=80";
