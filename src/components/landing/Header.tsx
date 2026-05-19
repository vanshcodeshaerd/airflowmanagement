import { useState } from "react";
import { Menu, Plane, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SquareButton } from "./SquareButton";


const links = [
  { label: "Home", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm h-[70px]">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        <a href="#home" className="flex items-center gap-2 text-primary">
          <Plane className="w-6 h-6 text-accent" />
          <span className="font-display font-extrabold text-xl md:text-2xl">AirFlow Management</span>
        </a>
        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-sans text-primary hover:text-accent transition-colors">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hidden md:block">
          <Link to="/auth"><SquareButton className="!px-7 !py-3 !text-xs">Get Started</SquareButton></Link>
        </div>

        <button className="md:hidden text-primary" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <div className="md:hidden bg-white border-t border-border px-6 py-4 flex flex-col gap-4">
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-primary font-sans text-sm">
              {l.label}
            </a>
          ))}
          <Link to="/auth" onClick={() => setOpen(false)}><SquareButton className="w-full">Get Started</SquareButton></Link>
        </div>
      )}
    </header>
  );
}
