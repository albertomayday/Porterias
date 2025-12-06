import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Download, Calendar, Grid3X3 } from "lucide-react";
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

interface HorizontalVinetteViewerProps {
  strips: ComicStrip[];
  initialIndex?: number;
}

interface ProcessedVinette {
  stripId: string;
  vinetteIndex: number;
  imageData: string;
  stripTitle: string | null;
  stripDate: string;
}

const HorizontalVinetteViewer = ({ 
  strips, 
  initialIndex = 0 
}: HorizontalVinetteViewerProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [processedVinettes, setProcessedVinettes] = useState<ProcessedVinette[]>([]);
  const [isProcessing, setIsProcessing] = useState(true);
  const [viewMode, setViewMode] = useState<'vinettes' | 'full'>('vinettes');
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true,
    align: 'center',
    startIndex: 0
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

  // Procesar todas las tiras para extraer viñetas
  useEffect(() => {
    if (strips.length > 0) {
      processAllStrips();
    }
  }, [strips]);

  const processAllStrips = async () => {
    setIsProcessing(true);
    const allVinettes: ProcessedVinette[] = [];
    let processedCount = 0;

    for (const strip of strips) {
      try {
        await new Promise<void>((resolve) => {
          const converter = {
            extractVinettes: async (imageUrl: string) => {
              try {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                
                await new Promise((imgResolve, imgReject) => {
                  img.onload = imgResolve;
                  img.onerror = imgReject;
                  img.src = imageUrl;
                });

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error('No se pudo obtener contexto 2D');

                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                // Detectar separadores y extraer viñetas
                const vinettes = await extractVinetteImages(img, canvas, ctx);
                
                // Agregar viñetas al array principal
                vinettes.forEach((vinetteData, index) => {
                  allVinettes.push({
                    stripId: strip.id,
                    vinetteIndex: index,
                    imageData: vinetteData,
                    stripTitle: strip.title,
                    stripDate: strip.publish_date
                  });
                });

                processedCount++;
                resolve();
              } catch (error) {
                console.error(`Error procesando ${strip.id}:`, error);
                // En caso de error, usar imagen completa
                allVinettes.push({
                  stripId: strip.id,
                  vinetteIndex: 0,
                  imageData: strip.image_url,
                  stripTitle: strip.title,
                  stripDate: strip.publish_date
                });
                processedCount++;
                resolve();
              }
            }
          };

          converter.extractVinettes(strip.image_url);
        });
      } catch (error) {
        console.error(`Error con tira ${strip.id}:`, error);
      }
    }

    setProcessedVinettes(allVinettes);
    setIsProcessing(false);
    
    toast.success(`Procesadas ${allVinettes.length} viñetas de ${strips.length} tiras`);
  };

  const extractVinetteImages = async (
    img: HTMLImageElement,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D
  ): Promise<string[]> => {
    try {
      // Obtener datos de imagen para análisis
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Detectar líneas de separación horizontales
      const separatorLines = detectHorizontalSeparators(data, canvas.width, canvas.height);
      
      // Si no se detectaron separadores suficientes, dividir uniformemente
      if (separatorLines.length < 2) {
        return divideUniformly(img, canvas, ctx);
      }

      // Extraer viñetas basándose en separadores
      const regions = getSeparatedRegions(separatorLines, img.height);
      const vinettes: string[] = [];

      for (const region of regions) {
        const vinetteCanvas = document.createElement('canvas');
        const vinetteCtx = vinetteCanvas.getContext('2d');
        
        if (!vinetteCtx) continue;
        
        const regionHeight = region.end - region.start;
        vinetteCanvas.width = img.width;
        vinetteCanvas.height = regionHeight;
        
        vinetteCtx.drawImage(
          img,
          0, region.start,
          img.width, regionHeight,
          0, 0,
          img.width, regionHeight
        );
        
        vinettes.push(vinetteCanvas.toDataURL('image/png', 0.9));
      }

      return vinettes.length > 0 ? vinettes : [canvas.toDataURL('image/png', 0.9)];
    } catch (error) {
      console.error('Error en extracción de viñetas:', error);
      return [canvas.toDataURL('image/png', 0.9)];
    }
  };

  const detectHorizontalSeparators = (
    data: Uint8ClampedArray, 
    width: number, 
    height: number
  ): number[] => {
    const separators: number[] = [];
    const threshold = 0.7; // 70% de píxeles claros
    const minSeparatorHeight = 3;
    const minVinetteHeight = 80; // Mínimo 80px entre viñetas

    for (let y = minVinetteHeight; y < height - minVinetteHeight; y += 5) { // Saltar de 5 en 5 para optimización
      let lightPixelCount = 0;
      let totalPixels = 0;
      
      for (let dy = 0; dy < minSeparatorHeight && (y + dy) < height; dy++) {
        for (let x = 0; x < width; x += 3) { // Saltar píxeles para optimización
          const idx = ((y + dy) * width + x) * 4;
          const r = data[idx] || 255;
          const g = data[idx + 1] || 255;
          const b = data[idx + 2] || 255;
          
          const brightness = (r + g + b) / 3;
          if (brightness > 180) lightPixelCount++;
          totalPixels++;
        }
      }
      
      if (totalPixels > 0 && (lightPixelCount / totalPixels) > threshold) {
        const lastSeparator = separators[separators.length - 1];
        if (!lastSeparator || (y - lastSeparator) > minVinetteHeight) {
          separators.push(y);
        }
      }
    }

    return separators;
  };

  const getSeparatedRegions = (separators: number[], totalHeight: number) => {
    const regions: { start: number; end: number }[] = [];
    
    if (separators.length > 0) {
      // Primera región
      regions.push({ start: 0, end: separators[0] });
      
      // Regiones intermedias
      for (let i = 0; i < separators.length - 1; i++) {
        regions.push({
          start: separators[i] + 10, // Saltar separador
          end: separators[i + 1]
        });
      }
      
      // Última región
      regions.push({
        start: separators[separators.length - 1] + 10,
        end: totalHeight
      });
    }
    
    return regions.filter(region => (region.end - region.start) > 50);
  };

  const divideUniformly = (
    img: HTMLImageElement,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D
  ): string[] => {
    const vinettes: string[] = [];
    const aspectRatio = img.height / img.width;
    
    // Estimar viñetas basándose en aspecto de imagen
    let estimatedVinettes = 3; // Por defecto 3 viñetas
    if (aspectRatio > 2) estimatedVinettes = 4;
    if (aspectRatio > 3) estimatedVinettes = 5;
    if (aspectRatio > 4) estimatedVinettes = 6;
    
    const vinetteHeight = Math.floor(img.height / estimatedVinettes);
    
    for (let i = 0; i < estimatedVinettes; i++) {
      const vinetteCanvas = document.createElement('canvas');
      const vinetteCtx = vinetteCanvas.getContext('2d');
      
      if (!vinetteCtx) continue;
      
      const startY = i * vinetteHeight;
      const actualHeight = (i === estimatedVinettes - 1) 
        ? img.height - startY 
        : vinetteHeight;
      
      vinetteCanvas.width = img.width;
      vinetteCanvas.height = actualHeight;
      
      vinetteCtx.drawImage(
        img,
        0, startY,
        img.width, actualHeight,
        0, 0,
        img.width, actualHeight
      );
      
      vinettes.push(vinetteCanvas.toDataURL('image/png', 0.9));
    }
    
    return vinettes;
  };

  const downloadVinette = async (vinette: ProcessedVinette) => {
    try {
      toast.info("Generando PDF de viñeta...");
      
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = vinette.imageData;
      });

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [img.width, img.height],
      });

      pdf.addImage(img, "PNG", 0, 0, img.width, img.height);
      
      const fileName = `${vinette.stripTitle || 'vinette'}_${vinette.vinetteIndex + 1}.pdf`;
      pdf.save(fileName);
      toast.success("PDF de viñeta descargado");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al generar PDF");
    }
  };

  if (isProcessing) {
    return (
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-7xl text-center">
          <div className="inline-block border-2 border-primary px-6 py-2 mb-4">
            <p className="text-xs tracking-[0.3em] uppercase font-medium">
              Procesando tiras cómicas
            </p>
          </div>
          <h2 className="text-3xl font-bold mb-4">
            Convirtiendo a viñetas horizontales...
          </h2>
          <div className="flex justify-center items-center space-x-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span>Extrayendo viñetas de {strips.length} tiras</span>
          </div>
        </div>
      </section>
    );
  }

  if (processedVinettes.length === 0) {
    return (
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-7xl text-center">
          <h2 className="text-3xl font-bold mb-4">No se pudieron procesar las tiras</h2>
          <p className="text-muted-foreground">Intenta recargar la página</p>
        </div>
      </section>
    );
  }

  const currentVinette = processedVinettes[selectedIndex];

  return (
    <section className="py-8 px-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header con información de la viñeta actual */}
        <div className="text-center mb-8 space-y-4">
          <div className="flex justify-center items-center gap-4 mb-4">
            <div className="inline-block border-2 border-primary px-6 py-2">
              <p className="text-xs tracking-[0.3em] uppercase font-medium">
                Viñeta {selectedIndex + 1} de {processedVinettes.length}
              </p>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'vinettes' ? 'full' : 'vinettes')}
              className="border-2 border-primary"
            >
              <Grid3X3 className="mr-2 h-4 w-4" />
              {viewMode === 'vinettes' ? 'Ver tira completa' : 'Ver viñetas'}
            </Button>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            {currentVinette.stripTitle || 'Tira Cómica'}
          </h2>
          
          <p className="text-lg text-muted-foreground">
            {new Date(currentVinette.stripDate).toLocaleDateString('es-ES', { 
              day: 'numeric',
              month: 'long',
              year: 'numeric' 
            })} - Viñeta {currentVinette.vinetteIndex + 1}
          </p>
        </div>

        {/* Carousel de viñetas */}
        <div className="relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {processedVinettes.map((vinette, index) => (
                <div key={`${vinette.stripId}-${vinette.vinetteIndex}`} className="flex-[0_0_100%] min-w-0">
                  <div className="mx-4">
                    <div className="relative bg-card border-2 border-primary p-4 md:p-8 shadow-editorial">
                      <img
                        src={vinette.imageData}
                        alt={`${vinette.stripTitle || 'Tira'} - Viñeta ${vinette.vinetteIndex + 1}`}
                        className="w-full h-auto max-h-[70vh] object-contain mx-auto"
                        loading={index === selectedIndex ? "eager" : "lazy"}
                      />
                      
                      {/* Controles de descarga */}
                      <div className="absolute top-4 right-4">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => downloadVinette(vinette)}
                          className="bg-white/90 backdrop-blur-sm border-primary hover:bg-primary hover:text-primary-foreground"
                          title="Descargar viñeta"
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
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm border-primary hover:bg-primary hover:text-primary-foreground z-10"
            onClick={scrollNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Información adicional */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {processedVinettes.length} viñetas extraídas de {strips.length} tiras
            </span>
            <span>•</span>
            <span>Navegación automática por viñetas individuales</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HorizontalVinetteViewer;