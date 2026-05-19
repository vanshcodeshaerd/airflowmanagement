import { useState } from "react";
import { motion } from "framer-motion";
import { gallery } from "@/data/landingPageContent";
import { ImageModal } from "./ImageModal";

export function GallerySection() {
  const [active, setActive] = useState<number | null>(null);
  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <h2 className="font-display font-extrabold text-3xl md:text-4xl text-primary text-center">
          See Our Platform in Action
        </h2>
        <p className="text-sm text-muted-foreground text-center mt-3">
          Visual tour of the platform interface and features
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 mt-12">
          {gallery.map((g, i) => (
            <motion.button
              key={g.src}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              onClick={() => setActive(i)}
              className="relative overflow-hidden group cursor-zoom-in"
              aria-label={`Open image: ${g.alt}`}
            >
              <img
                src={g.src}
                alt={g.alt}
                className="w-full h-[200px] object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/20 transition-colors" />
            </motion.button>
          ))}
        </div>
      </div>
      <ImageModal index={active} onClose={() => setActive(null)} onChange={setActive} />
    </section>
  );
}
