import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { gallery } from "@/data/landingPageContent";

interface Props {
  index: number | null;
  onClose: () => void;
  onChange: (i: number) => void;
}

export function ImageModal({ index, onClose, onChange }: Props) {
  useEffect(() => {
    if (index === null) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onChange((index + 1) % gallery.length);
      if (e.key === "ArrowLeft") onChange((index - 1 + gallery.length) % gallery.length);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [index, onClose, onChange]);

  return (
    <AnimatePresence>
      {index !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.button
            onClick={onClose}
            aria-label="Close"
            whileHover={{ scale: 1.2, rotate: 90 }}
            className="absolute top-6 right-6 text-white p-2"
          >
            <X className="w-8 h-8" />
          </motion.button>
          <button
            onClick={(e) => { e.stopPropagation(); onChange((index - 1 + gallery.length) % gallery.length); }}
            aria-label="Previous"
            className="absolute left-4 md:left-10 text-white hover:text-accent p-2"
          >
            <ChevronLeft className="w-10 h-10" />
          </button>
          <motion.img
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            src={gallery[index].src}
            alt={gallery[index].alt}
            className="max-h-[85vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => { e.stopPropagation(); onChange((index + 1) % gallery.length); }}
            aria-label="Next"
            className="absolute right-4 md:right-10 text-white hover:text-accent p-2"
          >
            <ChevronRight className="w-10 h-10" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
