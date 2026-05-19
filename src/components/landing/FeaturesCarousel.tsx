import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import type { Swiper as SwiperType } from "swiper";
import { features } from "@/data/landingPageContent";
import "swiper/css";
import "swiper/css/pagination";

export function FeaturesCarousel() {
  const ref = useRef<SwiperType | null>(null);
  return (
    <section id="features" className="py-20 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <h2 className="font-display font-extrabold text-3xl md:text-4xl text-primary text-center">
          Our Key Features
        </h2>
        <p className="text-[15px] text-muted-foreground text-center mt-3">
          Everything you need to manage your air travel
        </p>

        <div className="relative mt-12">
          <Swiper
            modules={[Autoplay, Navigation, Pagination]}
            autoplay={{ delay: 5000, disableOnInteraction: false }}
            loop
            spaceBetween={24}
            breakpoints={{ 0: { slidesPerView: 1 }, 640: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } }}
            pagination={{ clickable: true }}
            onBeforeInit={(s) => (ref.current = s)}
            className="!pb-12"
          >
            {features.map((f) => (
              <SwiperSlide key={f.title}>
                <div className="bg-white border border-border shadow-md hover:shadow-xl transition-shadow h-full">
                  <img src={f.image} alt={f.title} className="w-full h-44 object-cover" loading="lazy" />
                  <div className="p-5">
                    <h3 className="font-ui font-bold text-base text-primary">{f.title}</h3>
                    <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed">{f.description}</p>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          <button
            onClick={() => ref.current?.slidePrev()}
            aria-label="Previous"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 bg-white shadow p-2 text-accent hover:bg-accent hover:text-white transition"
          >
            <ChevronLeft />
          </button>
          <button
            onClick={() => ref.current?.slideNext()}
            aria-label="Next"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 bg-white shadow p-2 text-accent hover:bg-accent hover:text-white transition"
          >
            <ChevronRight />
          </button>
        </div>
      </div>

      <style>{`
        .swiper-pagination-bullet { background: var(--color-accent); opacity: 0.4; }
        .swiper-pagination-bullet-active { opacity: 1; }
      `}</style>
    </section>
  );
}
