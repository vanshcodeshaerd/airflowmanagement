import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "framer-motion";
import { Headphones, Plane, Star, Users } from "lucide-react";
import { stats } from "@/data/landingPageContent";

const icons = { Users, Plane, Star, Headphones };

function StatCard({ stat, delay }: { stat: typeof stats[number]; delay: number }) {
  const Icon = icons[stat.icon];
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView || stat.static) return;
    const controls = animate(0, stat.value, {
      duration: 2,
      delay,
      ease: "easeOut",
      onUpdate: (v) => setValue(v),
    });
    return () => controls.stop();
  }, [inView, stat, delay]);

  return (
    <div ref={ref} className="text-center">
      <Icon className="w-10 h-10 text-accent mx-auto" />
      <div className="font-display font-black text-5xl text-white mt-3">
        {stat.static ? stat.display(0) : stat.display(value)}
      </div>
      <div className="font-ui font-medium text-sm text-white/80 mt-2">{stat.label}</div>
    </div>
  );
}

export function StatisticsSection() {
  return (
    <section className="bg-gradient-to-br from-primary to-primary-deep py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="font-display font-extrabold text-3xl md:text-4xl text-white text-center">
          Trusted by Travelers Worldwide
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 mt-12">
          {stats.map((s, i) => (
            <StatCard key={s.label} stat={s} delay={i * 0.15} />
          ))}
        </div>
      </div>
    </section>
  );
}
