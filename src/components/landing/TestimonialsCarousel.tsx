import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import { Star } from "lucide-react";
import { testimonials } from "@/data/landingPageContent";
import "swiper/css";
import "swiper/css/pagination";

export function TestimonialsCarousel() {
  return (
    <section className="bg-muted py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="font-display font-extrabold text-3xl md:text-4xl text-primary text-center">
          What Our Users Say
        </h2>
        <Swiper
          modules={[Autoplay, Pagination]}
          autoplay={{ delay: 6000, disableOnInteraction: false }}
          loop
          spaceBetween={24}
          pagination={{ clickable: true }}
          breakpoints={{ 0: { slidesPerView: 1 }, 768: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } }}
          className="!pb-12 mt-10"
        >
          {testimonials.map((t) => (
            <SwiperSlide key={t.name}>
              <div className="bg-white p-7 shadow-md h-full flex flex-col">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#ffc107] text-[#ffc107]" />
                  ))}
                </div>
                <p className="italic text-sm text-primary mt-4 flex-1 leading-relaxed">"{t.quote}"</p>
                <div className="flex items-center gap-3 mt-5">
                  <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover" loading="lazy" />
                  <div>
                    <div className="font-ui font-semibold text-sm text-primary">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.title}</div>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
