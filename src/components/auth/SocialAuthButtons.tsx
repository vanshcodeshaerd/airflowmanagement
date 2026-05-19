import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

export function SocialAuthButtons({
  mode,
  onSwitchTab,
}: {
  mode: "login" | "signup";
  onSwitchTab: () => void;
}) {
  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/user-dashboard` },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4, duration: 0.4 }}
      className="mt-6"
    >
      <div className="flex items-center gap-3 text-[12px] text-muted-foreground font-sans my-4">
        <span className="flex-1 h-px bg-border" />
        Or continue with
        <span className="flex-1 h-px bg-border" />
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        className="w-full flex items-center justify-center gap-2 border-2 border-border bg-white py-3 rounded-none font-ui font-semibold text-[13px] text-primary hover:border-accent hover:bg-sky-soft transition-all duration-300"
      >
        <GoogleIcon />
        Google
      </button>

      <p className="text-center text-[12px] text-muted-foreground font-sans mt-5">
        {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={onSwitchTab}
          className="text-accent font-ui font-semibold hover:text-accent-strong hover:underline"
        >
          {mode === "login" ? "Sign up" : "Login"}
        </button>
      </p>
    </motion.div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.8 6.4 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.3-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.8 6.4 29.1 4.5 24 4.5c-7.4 0-13.8 4.1-17.7 10.2z" />
      <path fill="#4CAF50" d="M24 43.5c5.1 0 9.7-1.9 13.2-5l-6.1-5c-2 1.4-4.4 2.2-7.1 2.2-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.9 39.4 16.4 43.5 24 43.5z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.1 5C40.9 35.3 43.5 30 43.5 24c0-1.2-.1-2.4-.3-3.5z" />
    </svg>
  );
}
