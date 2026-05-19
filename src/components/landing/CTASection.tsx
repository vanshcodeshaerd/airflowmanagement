import { motion } from "framer-motion";
import { SquareButton } from "./SquareButton";

export function CTASection() {
  return (
    <section id="contact" className="bg-gradient-to-br from-primary to-primary-deep py-24 px-6">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8 }}
        className="max-w-4xl mx-auto text-center"
      >
        <h2 className="font-display font-black text-4xl md:text-5xl text-white">
          Your Complete Travel Companion
        </h2>
        <p className="text-base text-white/90 mt-5 max-w-2xl mx-auto">
          Manage flights, store documents, organize passengers — all in one intelligent platform
        </p>
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.3 }}
          className="mt-8 inline-block"
        >
          <SquareButton className="!px-10 !py-4 !text-[15px]">
            Start Managing Your Flights Now
          </SquareButton>
        </motion.div>
        <p className="text-xs text-white/70 mt-4">
          No credit card required • Free account • Instant access
        </p>
      </motion.div>
    </section>
  );
}
