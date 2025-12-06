import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, Download, Eye, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import useEmblaCarousel from "embla-carousel-react";
import jsPDF from "jspdf";
import { toast } from "sonner";

interface ComicStrip {
  id: string;
  title: string | null;
  image_url: string;
  publish_date: string;
}

interface Vinette {
  id: string;
  stripId: string;
  stripTitle: string | null;
  stripDate: string;
  imageData: string;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SmartVinetteViewerProps {
  strips: ComicStrip[];
}

const SmartVinetteViewer = ({ strips }: SmartVinetteViewerProps) => {
  const [vinettes, setVinettes] = useState<Vinette[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(true);
  const [debugMode, setDebugMode] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true,
    align: 'center',
    containScroll: 'trimSnaps'
  });

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

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

  useEffect(() => {
    if (strips.length > 0) {
      processStrips();
    }
  }, [strips]);

  const processStrips = async () => {
    setIsProcessing(true);
    console.log(`🎬 Iniciando procesamiento de ${strips.length} tiras...`);
    
    const allVinettes: Vinette[] = [];
    let vinetteCounter = 0;

    for (const strip of strips) {
      try {
        console.log(`📸 Procesando tira: ${strip.title || strip.id}`);
        const stripVinettes = await analyzeStrip(strip, vinetteCounter);
        allVinettes.push(...stripVinettes);
        vinetteCounter += stripVinettes.length;
        
        // Pequeña pausa para evitar sobrecarga
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ Error procesando tira ${strip.id}:`, error);
        // Crear viñeta de emergencia con toda la imagen
        allVinettes.push({
          id: `${strip.id}-emergency`,
          stripId: strip.id,
          stripTitle: strip.title,
          stripDate: strip.publish_date,
          imageData: strip.image_url,
          index: vinetteCounter++,
          x: 0, y: 0, width: 100, height: 100
        });
      }
    }

    console.log(`✅ Procesamiento completado: ${allVinettes.length} viñetas extraídas`);
    setVinettes(allVinettes);
    setIsProcessing(false);
    
    if (allVinettes.length > 0) {
      toast.success(`${allVinettes.length} viñetas procesadas correctamente`);
    }
  };

  const analyzeStrip = async (strip: ComicStrip, startIndex: number): Promise<Vinette[]> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            throw new Error('No se pudo crear contexto 2D');
          }

          // Configurar canvas con la imagen
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          console.log(`📏 Dimensiones: ${img.width}x${img.height}, Ratio: ${(img.height/img.width).toFixed(2)}`);

          // Analizar la imagen para encontrar viñetas
          const vinetteRegions = await detectVinetteRegions(canvas, ctx);
          console.log(`🔍 Encontradas ${vinetteRegions.length} regiones de viñetas`);

          // Crear viñetas a partir de las regiones
          const stripVinettes: Vinette[] = [];
          
          for (let i = 0; i < vinetteRegions.length; i++) {
            const region = vinetteRegions[i];
            
            // Crear canvas para esta viñeta
            const vinetteCanvas = document.createElement('canvas');
            const vinetteCtx = vinetteCanvas.getContext('2d');
            
            if (!vinetteCtx) continue;

            // Configurar dimensiones de la viñeta con margen
            const margin = 5;
            const vinetteWidth = Math.max(50, region.width - margin * 2);
            const vinetteHeight = Math.max(50, region.height - margin * 2);
            
            vinetteCanvas.width = vinetteWidth;
            vinetteCanvas.height = vinetteHeight;

            // Extraer la región de la imagen original
            vinetteCtx.drawImage(
              img,
              region.x + margin,
              region.y + margin,
              vinetteWidth,
              vinetteHeight,
              0,
              0,
              vinetteWidth,
              vinetteHeight
            );

            // Crear viñeta
            stripVinettes.push({
              id: `${strip.id}-${i}`,
              stripId: strip.id,
              stripTitle: strip.title,
              stripDate: strip.publish_date,
              imageData: vinetteCanvas.toDataURL('image/png', 0.9),
              index: startIndex + i,
              x: region.x,
              y: region.y,
              width: region.width,
              height: region.height
            });
          }

          resolve(stripVinettes);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error(`Error cargando imagen: ${strip.image_url}`));
      img.src = strip.image_url;
    });
  };

  const detectVinetteRegions = async (
    canvas: HTMLCanvasElement, 
    ctx: CanvasRenderingContext2D
  ): Promise<Array<{ x: number; y: number; width: number; height: number }>> => {
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;

    // Encontrar líneas horizontales de separación
    const separators = findHorizontalSeparators(data, width, height);
    console.log(`🔄 Separadores detectados en Y: [${separators.join(', ')}]`);

    // Crear regiones basándose en separadores
    const regions: Array<{ x: number; y: number; width: number; height: number }> = [];
    
    if (separators.length === 0) {
      // No hay separadores claros, dividir uniformemente
      const aspectRatio = height / width;
      let numPanels = Math.max(2, Math.min(6, Math.round(aspectRatio * 1.5)));
      
      console.log(`📐 División uniforme: ${numPanels} paneles (aspecto: ${aspectRatio.toFixed(2)})`);
      
      const panelHeight = Math.floor(height / numPanels);
      
      for (let i = 0; i < numPanels; i++) {
        const y = i * panelHeight;
        const panelActualHeight = (i === numPanels - 1) ? height - y : panelHeight;
        
        regions.push({
          x: 0,
          y: y,
          width: width,
          height: panelActualHeight
        });
      }
    } else {
      // Usar separadores detectados
      let lastY = 0;
      
      separators.forEach(separatorY => {
        if (separatorY - lastY > 30) { // Mínimo 30px de altura
          regions.push({
            x: 0,
            y: lastY,
            width: width,
            height: separatorY - lastY
          });
        }
        lastY = separatorY + 10; // Saltar el separador
      });
      
      // Última región
      if (height - lastY > 30) {
        regions.push({
          x: 0,
          y: lastY,
          width: width,
          height: height - lastY
        });
      }
    }

    return regions.filter(region => region.height > 20 && region.width > 20);
  };

  const findHorizontalSeparators = (
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): number[] => {
    const separators: number[] = [];
    const minSeparatorHeight = 12;
    const whiteThreshold = 220;
    const minWhiteRatio = 0.7;

    for (let y = 20; y < height - 20; y++) {
      let whitePixelCount = 0;
      let totalPixelCount = 0;

      // Analizar varias líneas consecutivas para confirmar separador
      for (let dy = 0; dy < minSeparatorHeight && y + dy < height; dy++) {
        for (let x = Math.floor(width * 0.1); x < Math.floor(width * 0.9); x += 3) {
          const pixelIndex = ((y + dy) * width + x) * 4;
          const r = data[pixelIndex] || 255;
          const g = data[pixelIndex + 1] || 255;
          const b = data[pixelIndex + 2] || 255;
          
          const brightness = (r + g + b) / 3;
          if (brightness > whiteThreshold) {
            whitePixelCount++;
          }
          totalPixelCount++;
        }
      }

      const whiteRatio = whitePixelCount / totalPixelCount;
      
      if (whiteRatio > minWhiteRatio) {
        // Evitar separadores duplicados muy cercanos
        const lastSeparator = separators[separators.length - 1];
        if (!lastSeparator || (y - lastSeparator) > 40) {
          separators.push(y);
          console.log(`🔍 Separador detectado en Y=${y} (${(whiteRatio*100).toFixed(1)}% blanco)`);
        }
      }
    }

    return separators;
  };

  const downloadVinette = async (vinette: Vinette) => {
    try {
      toast.info("Generando PDF...");
      
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Error cargando imagen'));
        img.src = vinette.imageData;
      });

      // Crear PDF con orientación optimizada
      const isWide = img.width > img.height;
      const pdf = new jsPDF({
        orientation: isWide ? 'landscape' : 'portrait',
        unit: 'px',
        format: [img.width, img.height],
      });

      pdf.addImage(img, "PNG", 0, 0, img.width, img.height);
      
      const filename = `${vinette.stripTitle || 'vinette'}_${vinette.index + 1}.pdf`;
      pdf.save(filename);
      toast.success("PDF descargado correctamente");
    } catch (error) {
      console.error("Error generando PDF:", error);
      toast.error("Error al generar PDF");
    }
  };

  if (isProcessing) {
    return (
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-6xl text-center">
          <div className="inline-block border-2 border-primary px-6 py-2 mb-4">
            <p className="text-xs tracking-[0.3em] uppercase font-medium">
              Analizando Tiras Cómicas
            </p>
          </div>
          <h2 className="text-3xl font-bold mb-8">
            Procesamiento Inteligente de Viñetas
          </h2>
          <div className="flex justify-center items-center space-x-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <div className="text-left">
              <p className="font-medium">Analizando {strips.length} tiras</p>
              <p className="text-sm text-muted-foreground">Detectando separadores automáticamente</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (vinettes.length === 0) {
    return (
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-6xl text-center">
          <h2 className="text-3xl font-bold mb-4">No se encontraron viñetas</h2>
          <p className="text-muted-foreground">Verifica las imágenes en la consola del navegador</p>
          <Button 
            onClick={processStrips} 
            className="mt-4"
            variant="outline"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reintentar Procesamiento
          </Button>
        </div>
      </section>
    );
  }

  const currentVinette = vinettes[selectedIndex];

  return (
    <section className="py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-4 mb-4">
            <div className="border-2 border-primary px-4 py-2">
              <p className="text-xs tracking-[0.3em] uppercase font-medium">
                Viñeta {selectedIndex + 1} de {vinettes.length}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDebugMode(!debugMode)}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              {debugMode ? 'Ocultar Info' : 'Mostrar Info'}
            </Button>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            {currentVinette?.stripTitle || 'Tira Cómica'}
          </h2>
          
          <p className="text-lg text-muted-foreground">
            {currentVinette && new Date(currentVinette.stripDate).toLocaleDateString('es-ES', { 
              day: 'numeric',
              month: 'long',
              year: 'numeric' 
            })}
          </p>
        </div>

        {/* Carousel */}
        <div className="relative mb-8">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {vinettes.map((vinette) => (
                <div key={vinette.id} className="flex-[0_0_100%] min-w-0">
                  <div className="mx-4">
                    <Card className="border-2 border-primary shadow-lg">
                      <CardContent className="p-4">
                        <div className="relative">
                          <img
                            src={vinette.imageData}
                            alt={`${vinette.stripTitle} - Viñeta ${vinette.index + 1}`}
                            className="w-full h-auto max-h-[75vh] object-contain mx-auto rounded"
                            style={{
                              minHeight: '200px',
                              backgroundColor: '#f8f9fa'
                            }}
                            loading="lazy"
                          />
                          
                          {/* Debug info */}
                          {debugMode && (
                            <div className="absolute top-2 left-2 bg-black/70 text-white text-xs p-2 rounded">
                              <div>ID: {vinette.id}</div>
                              <div>Pos: {vinette.x},{vinette.y}</div>
                              <div>Tamaño: {vinette.width}x{vinette.height}</div>
                            </div>
                          )}
                          
                          {/* Download button */}
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={() => downloadVinette(vinette)}
                            className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm hover:bg-white shadow-md"
                            title={`Descargar viñeta ${vinette.index + 1}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation buttons */}
          <Button
            variant="outline"
            size="icon"
            onClick={scrollPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm border-2 border-primary hover:bg-primary hover:text-white shadow-lg z-10"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={scrollNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm border-2 border-primary hover:bg-primary hover:text-white shadow-lg z-10"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Summary */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            {vinettes.length} viñetas extraídas de {strips.length} tiras cómicas
            {debugMode && " • Modo debug activado"}
          </p>
        </div>

        {/* Hidden canvas for debugging */}
        <canvas 
          ref={canvasRef} 
          style={{ display: debugMode ? 'block' : 'none' }} 
          className="mt-4 border mx-auto max-w-full"
        />
      </div>
    </section>
  );
};

export default SmartVinetteViewer;