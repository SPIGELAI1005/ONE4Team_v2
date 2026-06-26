import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { PublicClubNewsCard } from "@/components/public-club/public-club-news-card";
import type { NewsRowLite } from "@/lib/public-club-models";
import { cn } from "@/lib/utils";

const AUTOPLAY_DELAY_MS = 4500;

export interface PublicClubNewsCarouselSlide {
  item: NewsRowLite;
  href: string;
  categoryLabel: string;
}

interface PublicClubNewsCarouselProps {
  slides: PublicClubNewsCarouselSlide[];
  locale: string;
  readMoreLabel: string;
  previousLabel: string;
  nextLabel: string;
}

export function PublicClubNewsCarousel({
  slides,
  locale,
  readMoreLabel,
  previousLabel,
  nextLabel,
}: PublicClubNewsCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hoverPaused, setHoverPaused] = useState(false);
  const autoplayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const onSelect = useCallback((carouselApi: CarouselApi) => {
    setSelectedIndex(carouselApi.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!api) return;
    onSelect(api);
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api, onSelect]);

  useEffect(() => {
    if (!api || slides.length <= 1 || hoverPaused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    autoplayTimerRef.current = window.setInterval(() => {
      api.scrollNext();
    }, AUTOPLAY_DELAY_MS);

    return () => {
      if (autoplayTimerRef.current) {
        window.clearInterval(autoplayTimerRef.current);
        autoplayTimerRef.current = null;
      }
    };
  }, [api, hoverPaused, slides.length]);

  if (slides.length === 0) return null;

  if (slides.length === 1) {
    const only = slides[0];
    return (
      <PublicClubNewsCard
        item={only.item}
        href={only.href}
        locale={locale}
        categoryLabel={only.categoryLabel}
        readMoreLabel={readMoreLabel}
        variant="compact"
        className="h-full"
      />
    );
  }

  return (
    <div
      className="relative px-8 sm:px-10"
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
    >
      <Carousel setApi={setApi} opts={{ loop: true, align: "start", duration: 28 }} className="w-full">
        <CarouselContent className="-ml-3">
          {slides.map((slide) => (
            <CarouselItem
              key={slide.item.id}
              className="basis-full pl-3 sm:basis-1/2 lg:basis-1/3"
            >
              <PublicClubNewsCard
                item={slide.item}
                href={slide.href}
                locale={locale}
                categoryLabel={slide.categoryLabel}
                readMoreLabel={readMoreLabel}
                variant="compact"
                className="h-full"
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      <button
        type="button"
        aria-label={previousLabel}
        onClick={() => api?.scrollPrev()}
        className="absolute left-0 top-[calc(50%-1.25rem)] z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[color:var(--club-border)] bg-[color:var(--club-card)]/95 text-[color:var(--club-foreground)] shadow-md transition-colors hover:border-[color:var(--club-primary)]/50 hover:text-[color:var(--club-primary)]"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label={nextLabel}
        onClick={() => api?.scrollNext()}
        className="absolute right-0 top-[calc(50%-1.25rem)] z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[color:var(--club-border)] bg-[color:var(--club-card)]/95 text-[color:var(--club-foreground)] shadow-md transition-colors hover:border-[color:var(--club-primary)]/50 hover:text-[color:var(--club-primary)]"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="mt-4 flex justify-center gap-1.5">
        {slides.map((slide, index) => (
          <button
            key={slide.item.id}
            type="button"
            role="tab"
            aria-selected={index === selectedIndex}
            aria-label={`${slide.item.title} (${index + 1}/${slides.length})`}
            onClick={() => api?.scrollTo(index)}
            className={cn(
              "h-2 rounded-full transition-all",
              index === selectedIndex
                ? "w-6 bg-[color:var(--club-primary)]"
                : "w-2 bg-[color:var(--club-border)] hover:bg-[color:var(--club-primary)]/50"
            )}
          />
        ))}
      </div>
    </div>
  );
}
