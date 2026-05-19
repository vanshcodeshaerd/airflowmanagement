import { motion } from "framer-motion";
import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react";

const cols = [
  { title: "Product", links: ["Features", "Pricing", "Security", "Mobile App"] },
  { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
  { title: "Legal", links: ["Privacy Policy", "Terms of Service", "Contact Us"] },
];

export function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="bg-[#1a1a1a] text-white px-6 pt-14 pb-6"
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        <div>
          <h3 className="font-ui font-bold text-[13px]">About Us</h3>
          <p className="text-xs text-white/70 mt-3 leading-relaxed">
            AirFlow Management is a comprehensive platform designed to simplify travel management
            for passengers and airlines worldwide.
          </p>
          <div className="flex gap-3 mt-4">
            {[Facebook, Twitter, Instagram, Linkedin].map((I, i) => (
              <a key={i} href="#" aria-label="social" className="text-accent hover:text-white transition-colors">
                <I className="w-5 h-5" />
              </a>
            ))}
          </div>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h3 className="font-ui font-bold text-[13px]">{c.title}</h3>
            <ul className="mt-3 space-y-2">
              {c.links.map((l) => (
                <li key={l}>
                  <a href="#" className="text-xs text-accent hover:underline">{l}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="max-w-7xl mx-auto mt-10 pt-5 border-t border-white/10 text-center">
        <p className="text-[11px] text-white/50">© 2024 AirFlow Management. All rights reserved.</p>
      </div>
    </motion.footer>
  );
}
