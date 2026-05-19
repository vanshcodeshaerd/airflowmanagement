import { motion } from "framer-motion";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { Airport } from "./types";

interface Props {
  airport: Airport;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmDialog({ airport, isDeleting, onConfirm, onCancel }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white max-w-md w-full p-7"
      >
        <div className="flex items-start gap-3">
          <div className="bg-destructive/15 text-destructive p-2">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-xl text-primary">
              Delete this airport?
            </h3>
            <p className="text-[13px] text-muted-foreground font-sans mt-1">
              Are you sure you want to delete{" "}
              <strong className="text-primary">
                {airport.airport_name} ({airport.iata_code})
              </strong>
              ? This cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 border-2 border-border text-primary font-ui font-bold uppercase tracking-wider text-[12px] rounded-none hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-5 py-2.5 bg-destructive hover:bg-destructive/85 text-white font-ui font-bold uppercase tracking-wider text-[12px] rounded-none transition-all disabled:opacity-60 flex items-center gap-2"
          >
            {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}
