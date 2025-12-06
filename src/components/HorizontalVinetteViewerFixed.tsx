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

    console.log(`Iniciando procesamiento de ${strips.length} tiras...`);

    for (const strip of strips) {
      try {
        console.log(`Procesando tira: ${strip.id}`);
        const vinettes = await processStrip(strip);
        allVinettes.push(...vinettes);
      } catch (error) {
        console.error(`Error procesando tira ${strip.id}:`, error);
        // En caso de error, agregar la imagen completa como una sola viñeta
        allVinettes.push({
          stripId: strip.id,
          vinetteIndex: 0,
          imageData: strip.image_url,
          stripTitle: strip.title,
          stripDate: strip.publish_date
        });
      }
    }

    console.log(`Procesamiento completado. ${allVinettes.length} viñetas extraídas.`);
    setProcessedVinettes(allVinettes);
    setIsProcessing(false);
    
    if (allVinettes.length > 0) {
      toast.success(`${allVinettes.length} viñetas procesadas correctamente`);
    } else {
      toast.error("No se pudieron procesar las viñetas");
    }
  };

  const processStrip = async (strip: ComicStrip): Promise<ProcessedVinette[]> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            throw new Error('No se pudo obtener contexto 2D');
          }

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          // Detectar viñetas y extraerlas
          const vinettes = extractVinettes(img, canvas, ctx, strip);
          resolve(vinettes);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error(`Error cargando imagen: ${strip.image_url}`));
      };

      img.src = strip.image_url;
    });
  };

  const extractVinettes = (
    img: HTMLImageElement,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    strip: ComicStrip
  ): ProcessedVinette[] => {
    try {
      // Obtener datos de imagen
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Detectar líneas de separación
      const separators = detectSeparators(data, canvas.width, canvas.height);
      
      console.log(`Tira ${strip.id}: ${separators.length} separadores detectados`);

      // Si no hay suficientes separadores, dividir uniformemente
      if (separators.length < 1) {
        return divideUniformly(img, strip);
      }

      // Crear viñetas basándose en separadores
      const regions = createRegions(separators, canvas.height);
      const vinettes: ProcessedVinette[] = [];

      regions.forEach((region, index) => {
        if (region.height > 30) { // Mínimo 30px de altura
          const vinetteCanvas = document.createElement('canvas');
          const vinetteCtx = vinetteCanvas.getContext('2d');
          
          if (vinetteCtx) {
            vinetteCanvas.width = img.width;
            vinetteCanvas.height = region.height;
            
            vinetteCtx.drawImage(
              img,
              0, region.start,
              img.width, region.height,
              0, 0,
              img.width, region.height
            );
            
            vinettes.push({
              stripId: strip.id,
              vinetteIndex: index,
              imageData: vinetteCanvas.toDataURL('image/png', 0.8),
              stripTitle: strip.title,
              stripDate: strip.publish_date
            });
          }
        }
      });

      return vinettes.length > 0 ? vinettes : divideUniformly(img, strip);
    } catch (error) {
      console.error('Error en extractVinettes:', error);
      return divideUniformly(img, strip);
    }
  };

  const detectSeparators = (
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): number[] => {
    const separators: number[] = [];
    const minSeparatorHeight = 8;
    const lightThreshold = 200;
    const whiteRatioThreshold = 0.75;

    for (let y = 50; y < height - 50; y += 4) {
      let whitePixels = 0;
      let totalPixels = 0;

      // Analizar múltiples líneas para confirmar separador
      for (let dy = 0; dy < minSeparatorHeight && (y + dy) < height; dy++) {
        for (let x = 10; x < width - 10; x += 4) {
          const idx = ((y + dy) * width + x) * 4;
          const r = data[idx] || 255;
          const g = data[idx + 1] || 255;
          const b = data[idx + 2] || 255;
          
          const brightness = (r + g + b) / 3;
          if (brightness > lightThreshold) {
            whitePixels++;
          }
          totalPixels++;
        }
      }

      const whiteRatio = whitePixels / totalPixels;
      if (whiteRatio > whiteRatioThreshold) {
        // Evitar separadores muy cercanos
        const lastSeparator = separators[separators.length - 1];
        if (!lastSeparator || (y - lastSeparator) > 60) {
          separators.push(y);
        }
      }
    }

    return separators;
  };

  const createRegions = (separators: number[], totalHeight: number) => {
    const regions: { start: number; height: number }[] = [];
    
    if (separators.length === 0) return regions;

    // Primera región
    regions.push({ 
      start: 0, 
      height: separators[0] 
    });

    // Regiones intermedias
    for (let i = 0; i < separators.length - 1; i++) {
      const start = separators[i] + 15;
      const height = separators[i + 1] - start;
      regions.push({ start, height });
    }

    // Última región
    const lastStart = separators[separators.length - 1] + 15;
    regions.push({ 
      start: lastStart, 
      height: totalHeight - lastStart 
    });

    return regions;
  };

  const divideUniformly = (img: HTMLImageElement, strip: ComicStrip): ProcessedVinette[] => {
    const aspectRatio = img.height / img.width;
    let numVinettes = 3; // Por defecto 3

    if (aspectRatio > 2.5) numVinettes = 4;
    if (aspectRatio > 4) numVinettes = 5;
    if (aspectRatio > 6) numVinettes = 6;

    console.log(`División uniforme: ${numVinettes} viñetas para aspecto ${aspectRatio.toFixed(2)}`);

    const vinettes: ProcessedVinette[] = [];
    const vinetteHeight = Math.floor(img.height / numVinettes);

    for (let i = 0; i < numVinettes; i++) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) continue;

      const startY = i * vinetteHeight;
      const actualHeight = (i === numVinettes - 1) ? 
        img.height - startY : vinetteHeight;

      canvas.width = img.width;
      canvas.height = actualHeight;

      ctx.drawImage(
        img,
        0, startY, img.width, actualHeight,
        0, 0, img.width, actualHeight
      );

      vinettes.push({
        stripId: strip.id,
        vinetteIndex: i,
        imageData: canvas.toDataURL('image/png', 0.8),
        stripTitle: strip.title,
        stripDate: strip.publish_date
      });
    }

    return vinettes;
  };

  const downloadVinette = async (vinette: ProcessedVinette) => {
    try {
      toast.info("Generando PDF...");
      
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
      toast.success("PDF descargado");
    } catch (error) {
      console.error("Error generando PDF:", error);
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
            Extrayendo viñetas automáticamente...
          </h2>
          <div className="flex justify-center items-center space-x-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span>Analizando {strips.length} tiras</span>
          </div>
        </div>
      </section>
    );
  }

  if (processedVinettes.length === 0) {
    return (
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-7xl text-center">
          <h2 className="text-3xl font-bold mb-4">No se pudieron procesar las viñetas</h2>
          <p className="text-muted-foreground">Revisa la consola para más detalles</p>
        </div>
      </section>
    );
  }

  const currentVinette = processedVinettes[selectedIndex];

  return (
    <section className="py-8 px-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header con información */}
        <div className="text-center mb-8 space-y-4">
          <div className="inline-block border-2 border-primary px-6 py-2">
            <p className="text-xs tracking-[0.3em] uppercase font-medium">
              Viñeta {selectedIndex + 1} de {processedVinettes.length}
            </p>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            {currentVinette?.stripTitle || 'Tira Cómica'}
          </h2>
          
          <p className="text-lg text-muted-foreground">
            {currentVinette && new Date(currentVinette.stripDate).toLocaleDateString('es-ES', { 
              day: 'numeric',
              month: 'long',
              year: 'numeric' 
            })} - Viñeta {(currentVinette?.vinetteIndex || 0) + 1}
          </p>
        </div>

        {/* Carousel */}
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
                      
                      {/* Botón de descarga */}
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

          {/* Controles */}
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

        {/* Info */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {processedVinettes.length} viñetas de {strips.length} tiras
            </span>
            <span>•</span>
            <span>Detección automática de viñetas</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HorizontalVinetteViewer;