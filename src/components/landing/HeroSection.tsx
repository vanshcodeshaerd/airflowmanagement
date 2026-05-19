import { motion } from "framer-motion";
import { SquareButton } from "./SquareButton";
import { heroImage } from "@/data/landingPageContent";

export function HeroSection() {
  return (
    <section id="home" className="bg-gradient-to-b from-sky-soft to-white">
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="order-2 md:order-1"
        >
          <motion.img
            src={heroImage}
            alt="Modern airport terminal with passengers boarding"
            className="w-full h-[400px] md:h-[500px] object-cover shadow-2xl"
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            loading="eager"
          />
        </motion.div>

        <div className="order-1 md:order-2">
          <motion.h1
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-display font-black text-4xl md:text-5xl lg:text-[52px] leading-tight text-primary"
          >
            Airport &amp; Airline Management System
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="font-ui font-light italic text-lg text-accent mt-4"
          >
            Manage Your Flight. Own Your Journey.
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-[15px] text-muted-foreground mt-5 leading-relaxed max-w-lg"
          >
            Complete control over your passenger information, flight bookings, and travel
            documents in one secure platform. Store, manage, update, and organize all your
            flight details effortlessly.
          </motion.p>
          <div className="mt-7 flex flex-col sm:flex-row gap-4">
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.5 }}>
              <SquareButton>Explore Platform</SquareButton>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.6 }}>
              <SquareButton variant="outline">Learn More</SquareButton>
            </motion.div>
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.75 }}
            className="text-xs text-muted-foreground mt-5"
          >
            ✓ Secure &nbsp;•&nbsp; ✓ Fast &nbsp;•&nbsp; ✓ Reliable
          </motion.p>
        </div>
      </div>
    </section>
  );
}
