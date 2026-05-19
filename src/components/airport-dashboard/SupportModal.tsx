import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, Mail, MessageCircle, Phone, X } from "lucide-react";
import { toast } from "sonner";
import type { Airport } from "@/components/airports/types";

interface Props {
  airport: Pick<Airport, "iata_code" | "airport_name" | "contact_phone" | "contact_email">;
  open: boolean;
  onClose: () => void;
}

export function SupportModal({ airport, open, onClose }: Props) {
  if (!open) return null;

  const subject = encodeURIComponent(`Support request for ${airport.iata_code}`);
  const phoneHref = airport.contact_phone ? `tel:${airport.contact_phone}` : null;
  const emailHref = airport.contact_email
    ? `mailto:${airport.contact_email}?subject=${subject}`
    : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.25 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white max-w-lg w-full p-7 relative rounded-none"
        >
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 text-muted-foreground hover:text-primary"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="font-display font-extrabold text-2xl text-primary">
            Customer Support
          </h2>
          <p className="text-[13px] text-muted-foreground font-sans mt-1">
            Get help with your trip at {airport.iata_code} — {airport.airport_name}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
            <SupportTile
              icon={<Phone className="w-5 h-5" />}
              label="Call"
              hint={airport.contact_phone ?? "Not available"}
              href={phoneHref}
              accent="text-accent"
              border="hover:border-accent"
            />
            <SupportTile
              icon={<Mail className="w-5 h-5" />}
              label="Email"
              hint={airport.contact_email ?? "Not available"}
              href={emailHref}
              accent="text-warning"
              border="hover:border-warning"
            />
            <SupportTile
              icon={<MessageCircle className="w-5 h-5" />}
              label="Live Chat"
              hint="Chat with an agent"
              onClick={() => toast("Live chat is coming soon")}
              accent="text-success"
              border="hover:border-success"
            />
            <SupportTile
              icon={<HelpCircle className="w-5 h-5" />}
              label="FAQ / Help"
              hint="Browse common questions"
              onClick={() => toast("Help center is coming soon")}
              accent="text-primary"
              border="hover:border-primary"
            />
          </div>

          <p className="text-[11px] text-muted-foreground font-sans italic mt-5">
            Available 24 / 7 for emergencies. Average response time: under 5 minutes.
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

interface TileProps {
  icon: React.ReactNode;
  label: string;
  hint: string;
  href?: string | null;
  onClick?: () => void;
  accent: string;
  border: string;
}

function SupportTile({ icon, label, hint, href, onClick, accent, border }: TileProps) {
  const disabled = !href && !onClick;
  const cls = `flex items-start gap-3 bg-white border-2 border-border ${border} p-4 rounded-none transition text-left ${
    disabled ? "opacity-50 cursor-not-allowed" : "hover:-translate-y-0.5"
  }`;

  const body = (
    <>
      <span className={`${accent} mt-0.5`}>{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block font-ui font-bold text-[13px] uppercase tracking-wider text-primary">
          {label}
        </span>
        <span className="block text-[12px] text-muted-foreground font-sans truncate">
          {hint}
        </span>
      </span>
    </>
  );

  if (href) {
    return (
      <a href={href} className={cls}>
        {body}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {body}
    </button>
  );
}
