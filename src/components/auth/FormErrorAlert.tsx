import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

export function FormErrorAlert({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, x: 0 }}
      animate={{ opacity: 1, scale: 1, x: [0, -6, 6, -4, 4, 0] }}
      transition={{ duration: 0.4 }}
      className="flex items-start gap-2 border-2 border-destructive bg-destructive/5 p-3 mb-4"
      role="alert"
    >
      <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
      <p className="text-[13px] text-destructive font-sans">{message}</p>
    </motion.div>
  );
}
