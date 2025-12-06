import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Download, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import useEmblaCarousel from "embla-carousel-react";
import jsPDF from "jspdf";
import { toast } from "sonner";

interface ComicStrip {
  id: string;
  title: string | null;
  image_url: string;
  publish_date: string;
}

interface HorizontalStripViewerProps {
  strips: ComicStrip[];
  initialIndex?: number;
}

const HorizontalStripViewer = ({ 
  strips, 
  initialIndex = 0 
}: HorizontalStripViewerProps) => {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true,
    align: 'center',
    startIndex: initialIndex
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback((index: number) => {
    if (emblaApi) emblaApi.scrollTo(index);
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  const downloadAsPDF = async (strip: ComicStrip) => {
    try {
      toast.info("Generando PDF...");
      
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = strip.image_url;
      });

      const pdf = new jsPDF({
        orientation: img.width > img.height ? "landscape" : "portrait",
        unit: "px",
        format: [img.width, img.height],
      });

      pdf.addImage(img, "PNG", 0, 0, img.width, img.height);
      
      const fileName = strip.title 
        ? `${strip.title.replace(/[^a-z0-9]/gi, '_')}.pdf`
        : `tira_${strip.publish_date}.pdf`;
      
      pdf.save(fileName);
      toast.success("PDF descargado");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el PDF");
    }
  };

  if (!strips.length) return null;

  const currentStrip = strips[selectedIndex];

  return (
    <section className="py-8 px-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header con información de la tira actual */}
        <div className="text-center mb-8 space-y-4">
          <div className="inline-block border-2 border-primary px-6 py-2">
            <p className="text-xs tracking-[0.3em] uppercase font-medium">
              {selectedIndex === 0 ? 'Última edición' : `Archivo - ${selectedIndex + 1} de ${strips.length}`}
            </p>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            {new Date(currentStrip.publish_date).toLocaleDateString('es-ES', { 
              day: 'numeric',
              month: 'long',
              year: 'numeric' 
            })}
          </h2>
          
          {currentStrip.title && (
            <p className="text-lg text-muted-foreground italic">{currentStrip.title}</p>
          )}
        </div>

        {/* Carousel principal */}
        <div className="relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {strips.map((strip, index) => (
                <div key={strip.id} className="flex-[0_0_100%] min-w-0">
                  <div className="mx-4">
                    <div className="relative bg-card border-2 border-primary p-4 md:p-8 shadow-editorial">
                      <img
                        src={strip.image_url}
                        alt={strip.title || `Tira cómica del ${strip.publish_date}`}
                        className="w-full h-auto max-h-[70vh] object-contain mx-auto"
                        loading={index === selectedIndex ? "eager" : "lazy"}
                      />
                      
                      {/* Overlay con controles */}
                      <div className="absolute top-4 right-4 flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => downloadAsPDF(strip)}
                          className="bg-white/90 backdrop-blur-sm border-primary hover:bg-primary hover:text-primary-foreground"
                          title="Descargar PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Controles de navegación */}
          <Button
            variant="outline"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm border-primary hover:bg-primary hover:text-primary-foreground z-10"
            onClick={scrollPrev}
            disabled={strips.length <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm border-primary hover:bg-primary hover:text-primary-foreground z-10"
            onClick={scrollNext}
            disabled={strips.length <= 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Indicadores de páginas / Thumbnails */}
        {strips.length > 1 && (
          <div className="mt-8">
            <div className="flex justify-center items-center gap-2 flex-wrap max-w-4xl mx-auto">
              {strips.map((strip, index) => (
                <button
                  key={strip.id}
                  onClick={() => scrollTo(index)}
                  className={`relative group transition-all duration-200 ${
                    index === selectedIndex 
                      ? 'ring-2 ring-primary ring-offset-2' 
                      : 'hover:ring-1 hover:ring-primary/50'
                  }`}
                  title={strip.title || `Tira del ${new Date(strip.publish_date).toLocaleDateString('es-ES')}`}
                >
                  <div className="w-16 h-12 md:w-20 md:h-16 border-2 border-primary bg-card overflow-hidden">
                    <img
                      src={strip.image_url}
                      alt={`Miniatura ${index + 1}`}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                    />
                  </div>
                  
                  {/* Número de tira */}
                  <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Información adicional */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {strips.length} tiras disponibles
            </span>
            <span>•</span>
            <span>Usa las flechas o haz click en las miniaturas para navegar</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HorizontalStripViewer;