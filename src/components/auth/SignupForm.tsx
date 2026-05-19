import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, User, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { signupSchema, type SignupValues } from "@/lib/auth/schemas";
import { supabase } from "@/integrations/supabase/client";
import { FormErrorAlert } from "./FormErrorAlert";
import { PasswordStrengthIndicator } from "./PasswordStrengthIndicator";
import { SocialAuthButtons } from "./SocialAuthButtons";

const fieldLabel = "block text-[11px] font-display font-semibold tracking-[0.12em] uppercase text-primary mb-1.5";
const fieldWrap = "relative";
const fieldInput =
  "w-full font-sans text-[14px] border-2 border-border rounded-none pl-10 pr-3 py-3 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/12 transition placeholder:text-muted-foreground/70";
const fieldIcon = "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none";

export function SignupForm({ onSwitchTab }: { onSwitchTab: () => void }) {
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({ resolver: zodResolver(signupSchema), mode: "onTouched" });

  const password = watch("password") ?? "";
  const confirmPassword = watch("confirmPassword") ?? "";
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const onSubmit = async (values: SignupValues) => {
    setSubmitError(null);
    const redirectTo = `${window.location.origin}/user-dashboard`;
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { full_name: values.fullName },
        emailRedirectTo: redirectTo,
      },
    });
    if (error) {
      const msg = /registered|exists/i.test(error.message)
        ? "This email is already registered"
        : error.message;
      setSubmitError(msg);
      return;
    }
    setSuccess(true);
    localStorage.setItem("userRole", "USER");
    setTimeout(() => {
      navigate({ to: "/user-dashboard" as never }).catch(() => {
        window.location.href = "/user-dashboard";
      });
    }, 2500);
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-8"
      >
        <CheckCircle2 className="w-14 h-14 text-success mx-auto mb-4" />
        <h3 className="font-display font-extrabold text-2xl text-primary mb-2">
          Account created successfully!
        </h3>
        <p className="text-[13px] text-muted-foreground font-sans">
          You will be redirected in a moment…
        </p>
      </motion.div>
    );
  }

  const containerStagger = { animate: { transition: { staggerChildren: 0.07 } } };
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

      <motion.div variants={itemFade} className="mb-3">
        <label htmlFor="su-name" className={fieldLabel}>Full Name</label>
        <div className={fieldWrap}>
          <User className={fieldIcon} />
          <input
            id="su-name"
            type="text"
            autoComplete="name"
            placeholder="Your Name"
            className={fieldInput}
            {...register("fullName")}
          />
        </div>
        {errors.fullName && <p className="text-[12px] text-destructive mt-1 font-sans">{errors.fullName.message}</p>}
      </motion.div>

      <motion.div variants={itemFade} className="mb-3">
        <label htmlFor="su-email" className={fieldLabel}>Email Address</label>
        <div className={fieldWrap}>
          <Mail className={fieldIcon} />
          <input
            id="su-email"
            type="email"
            autoComplete="email"
            placeholder="your.email@example.com"
            className={fieldInput}
            {...register("email")}
          />
        </div>
        {errors.email && <p className="text-[12px] text-destructive mt-1 font-sans">{errors.email.message}</p>}
      </motion.div>

      <motion.div variants={itemFade} className="mb-3">
        <label htmlFor="su-pwd" className={fieldLabel}>Create Password</label>
        <div className={fieldWrap}>
          <Lock className={fieldIcon} />
          <input
            id="su-pwd"
            type={showPwd ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••••"
            className={fieldInput + " pr-10"}
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
        <PasswordStrengthIndicator password={password} />
        {errors.password && <p className="text-[12px] text-destructive mt-1 font-sans">{errors.password.message}</p>}
      </motion.div>

      <motion.div variants={itemFade} className="mb-3">
        <label htmlFor="su-confirm" className={fieldLabel}>Confirm Password</label>
        <div className={fieldWrap}>
          <Lock className={fieldIcon} />
          <input
            id="su-confirm"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••••"
            className={fieldInput + " pr-16"}
            {...register("confirmPassword")}
          />
          <AnimatePresence>
            {confirmPassword && (
              <motion.span
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute right-10 top-1/2 -translate-y-1/2"
              >
                {passwordsMatch ? (
                  <CheckCircle2 className="w-4 h-4 text-success" />
                ) : (
                  <XCircle className="w-4 h-4 text-destructive" />
                )}
              </motion.span>
            )}
          </AnimatePresence>
          <button
            type="button"
            onClick={() => setShowConfirm((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-accent"
            aria-label={showConfirm ? "Hide password" : "Show password"}
          >
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.confirmPassword && <p className="text-[12px] text-destructive mt-1 font-sans">{errors.confirmPassword.message}</p>}
      </motion.div>

      <motion.div variants={itemFade} className="my-4">
        <label className="flex items-start gap-2 text-[12px] text-primary font-sans cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 rounded-none border-2 border-border accent-accent mt-0.5"
            {...register("termsAgreed")}
          />
          <span>
            I agree to the{" "}
            <a href="#" className="text-accent underline hover:text-accent-strong">Terms of Service</a>
            {" "}and{" "}
            <a href="#" className="text-accent underline hover:text-accent-strong">Privacy Policy</a>
          </span>
        </label>
        {errors.termsAgreed && <p className="text-[12px] text-destructive mt-1 font-sans">{errors.termsAgreed.message}</p>}
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
            Creating account...
          </>
        ) : (
          "Create Account"
        )}
      </motion.button>

      <SocialAuthButtons mode="signup" onSwitchTab={onSwitchTab} />
    </motion.form>
  );
}
