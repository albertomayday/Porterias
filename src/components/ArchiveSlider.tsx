import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Video, Music } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ComicStrip {
  id: string;
  imageUrl: string;
  date: string;
  title?: string;
  mediaType?: 'image' | 'video' | 'audio';
}

interface ArchiveSliderProps {
  strips: ComicStrip[];
  onStripClick: (id: string) => void;
}

const ArchiveSlider = ({ strips, onStripClick }: ArchiveSliderProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <section className="py-16 bg-secondary border-t-2 border-primary">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="inline-block border-2 border-primary px-6 py-2 mb-4">
            <p className="text-xs tracking-[0.3em] uppercase font-medium">
              Archivo Completo
            </p>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Todas las Ediciones
          </h2>
          <p className="text-muted-foreground mt-2">
            Desliza para recorrer el historial completo
          </p>
        </div>

        {/* Slider */}
        <div className="relative">
          <Button
            variant="outline"
            size="icon"
            onClick={scrollPrev}
            disabled={!canScrollPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 border-2 border-primary bg-background hover:bg-primary hover:text-primary-foreground shadow-newspaper disabled:opacity-30"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>

          <div className="overflow-hidden mx-12" ref={emblaRef}>
            <div className="flex gap-6">
              {strips.map((strip) => (
                <button
                  key={strip.id}
                  onClick={() => onStripClick(strip.id)}
                  className="flex-shrink-0 group"
                >
                  <div className="w-72 border-2 border-primary bg-card overflow-hidden shadow-newspaper hover:shadow-editorial transition-all hover:scale-[1.02]">
                    <div className="aspect-[4/3] overflow-hidden relative">
                      <img
                        src={strip.imageUrl}
                        alt={`Tira del ${strip.date}`}
                        className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                      />
                      {strip.mediaType === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Video className="h-12 w-12 text-white" />
                        </div>
                      )}
                      {strip.mediaType === 'audio' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Music className="h-12 w-12 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="p-4 border-t-2 border-primary">
                      <p className="text-sm font-medium">
                        {new Date(strip.date).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                      {strip.title && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {strip.title}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={scrollNext}
            disabled={!canScrollNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 border-2 border-primary bg-background hover:bg-primary hover:text-primary-foreground shadow-newspaper disabled:opacity-30"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        {/* Dots indicator */}
        <div className="flex justify-center gap-2 mt-8">
          {strips.slice(0, Math.min(strips.length, 10)).map((_, index) => (
            <div
              key={index}
              className="w-2 h-2 rounded-full bg-primary/30"
            />
          ))}
          {strips.length > 10 && (
            <span className="text-xs text-muted-foreground ml-2">
              +{strips.length - 10} más
            </span>
          )}
        </div>
      </div>
    </section>
  );
};

export default ArchiveSlider;
