import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, Loader2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { loginSchema, type LoginValues } from "@/lib/auth/schemas";
import { supabase } from "@/integrations/supabase/client";
import { FormErrorAlert } from "./FormErrorAlert";
import { SocialAuthButtons } from "./SocialAuthButtons";

const fieldLabel = "block text-[11px] font-display font-semibold tracking-[0.12em] uppercase text-primary mb-1.5";
const fieldWrap = "relative";
const fieldInput =
  "w-full font-sans text-[14px] border-2 border-border rounded-none pl-10 pr-3 py-3 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/12 transition placeholder:text-muted-foreground/70";
const fieldIcon = "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none";

export function LoginForm({ onSwitchTab }: { onSwitchTab: () => void }) {
  const [showPwd, setShowPwd] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), mode: "onTouched" });

  const onSubmit = async (values: LoginValues) => {
    setSubmitError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (error) {
      setSubmitError("Invalid email or password. Please try again.");
      return;
    }
    localStorage.setItem("userRole", "USER");
    const dest = "/dashboard/airports";
    navigate({ to: dest as never }).catch(() => {
      window.location.href = dest;
    });
  };

  const containerStagger = {
    animate: { transition: { staggerChildren: 0.08 } },
  };
  const itemFade = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <motion.form
      onSubmit={handleSubmit(onSubmit)}
      variants={containerStagger}
      initial="initial"
      animate="animate"
      noValidate
    >
      {submitError && <FormErrorAlert message={submitError} />}

      <motion.div variants={itemFade} className="mb-4">
        <label htmlFor="login-email" className={fieldLabel}>Email Address</label>
        <div className={fieldWrap}>
          <Mail className={fieldIcon} />
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="your.email@example.com"
            className={fieldInput}
            aria-invalid={!!errors.email}
            {...register("email")}
          />
        </div>
        {errors.email && <p className="text-[12px] text-destructive mt-1 font-sans">{errors.email.message}</p>}
      </motion.div>

      <motion.div variants={itemFade} className="mb-3">
        <label htmlFor="login-password" className={fieldLabel}>Password</label>
        <div className={fieldWrap}>
          <Lock className={fieldIcon} />
          <input
            id="login-password"
            type={showPwd ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••••"
            className={fieldInput + " pr-10"}
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPwd((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-accent"
            aria-label={showPwd ? "Hide password" : "Show password"}
          >
            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && <p className="text-[12px] text-destructive mt-1 font-sans">{errors.password.message}</p>}
      </motion.div>

      <motion.div variants={itemFade} className="flex items-center justify-between my-4">
        <label className="flex items-center gap-2 text-[13px] text-primary font-sans cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 rounded-none border-2 border-border accent-accent"
            {...register("rememberMe")}
          />
          Remember me for 30 days
        </label>
        <a href="#" className="text-[12px] font-ui font-semibold text-accent hover:text-accent-strong hover:underline">
          Forgot password?
        </a>
      </motion.div>

      <motion.button
        variants={itemFade}
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-accent text-white font-ui font-bold uppercase tracking-wider text-sm py-3.5 rounded-none transition-all duration-300 hover:bg-accent-strong hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,99,204,0.3)] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Logging in...
          </>
        ) : (
          "Login to Account"
        )}
      </motion.button>

      <SocialAuthButtons mode="login" onSwitchTab={onSwitchTab} />
    </motion.form>
  );
}
