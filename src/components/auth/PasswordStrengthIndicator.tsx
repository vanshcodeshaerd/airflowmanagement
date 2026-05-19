import { motion } from "framer-motion";
import { passwordStrength } from "@/lib/auth/schemas";

export function PasswordStrengthIndicator({ password }: { password: string }) {
  if (!password) return null;
  const { score, label } = passwordStrength(password);
  const widthPct = [10, 40, 70, 100][score];
  const color =
    score >= 3 ? "var(--success)" : score === 2 ? "var(--warning)" : "var(--destructive)";
  return (
    <div className="mt-2">
      <div className="h-1 w-full bg-muted overflow-hidden">
        <motion.div
          initial={false}
          animate={{ width: `${widthPct}%`, backgroundColor: color }}
          transition={{ duration: 0.3 }}
          className="h-full"
        />
      </div>
      <p className="text-[11px] mt-1 text-muted-foreground font-sans">
        Password strength: <span style={{ color }}>{label}</span>
      </p>
    </div>
  );
}
