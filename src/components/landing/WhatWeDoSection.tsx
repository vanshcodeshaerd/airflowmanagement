import { motion } from "framer-motion";
import { FileText, Plane, Users } from "lucide-react";

const cards = [
  {
    icon: Users,
    title: "Passenger Data Management",
    text: "Store and organize all passenger information in one secure location. Add, edit, delete, and manage passenger details effortlessly. Keep all your travel companions' information safe and accessible.",
  },
  {
    icon: Plane,
    title: "Flight Booking & Information",
    text: "Search, compare, and manage flight bookings. Access detailed flight information including departure times, routes, airlines, and real-time status updates. Everything in one place.",
  },
  {
    icon: FileText,
    title: "Document & Boarding Pass Storage",
    text: "Keep all your travel documents organized and accessible. Store boarding passes, tickets, itineraries, and travel documents securely. Access them anytime, anywhere.",
  },
];

export function WhatWeDoSection() {
  return (
    <section id="about" className="bg-muted py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="font-display font-extrabold text-3xl md:text-4xl text-primary text-center">
          What Does This Platform Do?
        </h2>
        <p className="text-[15px] text-muted-foreground text-center mt-3">
          Designed for modern travelers and efficient airport operations
        </p>

        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {cards.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="bg-white border-l-4 border-accent p-7 shadow-sm hover:shadow-lg transition-shadow"
            >
              <c.icon className="text-accent w-8 h-8" />
              <h3 className="font-ui font-bold text-lg text-primary mt-4">{c.title}</h3>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{c.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
