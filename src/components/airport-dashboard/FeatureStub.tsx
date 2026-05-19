import { Link } from "@tanstack/react-router";
import { ArrowLeft, Construction } from "lucide-react";

interface Props {
  code: string;
  title: string;
  description: string;
}

export function FeatureStub({ code, title, description }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-5 h-[60px] flex items-center justify-between">
          <Link
            to="/airport/$code/dashboard"
            params={{ code }}
            className="flex items-center gap-2 text-primary hover:text-accent"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-display font-extrabold">Back to {code}</span>
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-5 py-20 text-center">
        <Construction className="w-12 h-12 mx-auto text-accent" />
        <h1 className="font-display font-extrabold text-4xl text-primary mt-6">{title}</h1>
        <p className="text-muted-foreground font-sans mt-3">{description}</p>
        <p className="text-[12px] text-muted-foreground font-sans mt-2">Coming soon for {code}.</p>
      </main>
    </div>
  );
}
