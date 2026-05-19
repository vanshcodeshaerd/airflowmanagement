import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ArrowLeft, HelpCircle, Plane } from "lucide-react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";
import authBg from "@/assets/auth-bg.jpg";

const TITLE = "Login - Airport & Airline Management System";
const DESC =
  "Secure login and signup for the Airport & Airline Management System. Access your flights, bookings, and travel information.";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      {
        name: "keywords",
        content:
          "airport management login, airline system sign up, secure login, flight booking login, admin login, travel platform authentication",
      },
      { name: "robots", content: "noindex, follow" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://airflowmanagement.lovable.app/auth" },
    ],
    links: [{ rel: "canonical", href: "https://airflowmanagement.lovable.app/auth" }],
  }),
});

type Tab = "login" | "signup";

function AuthPage() {
  const [tab, setTab] = useState<Tab>("login");

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-border h-[60px] flex items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2 text-primary hover:text-accent transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <Plane className="w-5 h-5" />
          <span className="font-display font-extrabold text-base">Back to Home</span>
        </Link>
        <a href="#" className="flex items-center gap-1.5 text-[13px] text-accent font-ui font-semibold hover:underline">
          <HelpCircle className="w-4 h-4" />
          Need help?
        </a>
      </header>

      {/* Body: split layout */}
      <div className="flex-1 grid md:grid-cols-2 relative">
        {/* Background image side (full-bleed on mobile, fixed on desktop) */}
        <div className="hidden md:block relative overflow-hidden">
          <motion.img
            src={authBg}
            alt="Travelers walking through a modern airport terminal at golden hour"
            width={1600}
            height={1200}
            initial={{ scale: 1 }}
            animate={{ scale: 1.04 }}
            transition={{ duration: 8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(120deg, rgba(0,53,128,0.85) 0%, rgba(0,31,63,0.55) 60%, rgba(0,31,63,0.15) 100%)",
            }}
          />
          <div className="absolute inset-0 flex items-end p-10">
            <div className="text-white max-w-md">
              <h2 className="font-display font-black text-3xl leading-tight">
                Manage Your Flight.<br />Own Your Journey.
              </h2>
              <p className="mt-3 text-sm text-white/85 font-sans">
                Secure access to your bookings, boarding passes, and travel documents — all in one place.
              </p>
            </div>
          </div>
        </div>

        {/* Mobile background */}
        <div className="md:hidden absolute inset-0 -z-10">
          <img src={authBg} alt="" aria-hidden="true" className="w-full h-full object-cover opacity-15" />
        </div>

        {/* Form side */}
        <div className="flex items-center justify-center p-5 md:p-10">
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="w-full max-w-[420px] bg-white shadow-[0_10px_40px_rgba(0,0,0,0.15)] p-9 md:p-10"
          >
            <h1 className="font-display font-extrabold text-3xl text-primary">
              {tab === "login" ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="text-[13px] text-muted-foreground font-sans mt-2 mb-6">
              {tab === "login"
                ? "Login to manage your flights and bookings"
                : "Sign up to get started with AirFlow"}
            </p>

            {/* Tabs */}
            <div className="relative grid grid-cols-2 mb-6 border-b-2 border-border">
              {(["login", "signup"] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`relative py-2.5 text-[13px] font-ui font-semibold uppercase tracking-wider transition-colors ${
                    tab === t ? "text-accent" : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  {t === "login" ? "Login" : "Sign Up"}
                  {tab === t && (
                    <motion.span
                      layoutId="auth-tab-underline"
                      className="absolute left-0 right-0 -bottom-[2px] h-[3px] bg-accent"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {tab === "login" ? (
                  <LoginForm onSwitchTab={() => setTab("signup")} />
                ) : (
                  <SignupForm onSwitchTab={() => setTab("login")} />
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
