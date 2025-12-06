import React, { useState, useEffect } from 'react';

interface VinetteConverterProps {
  imageUrl: string;
  onVinettesExtracted: (vinettes: string[]) => void;
}

const VinetteConverter: React.FC<VinetteConverterProps> = ({ 
  imageUrl, 
  onVinettesExtracted 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (imageUrl) {
      extractVinettes();
    }
  }, [imageUrl]);

  const extractVinettes = async () => {
    setIsProcessing(true);
    
    try {
      // Crear imagen y canvas
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No se pudo obtener contexto 2D');

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Obtener datos de imagen para análisis
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Detectar líneas de separación horizontales
      const separatorLines = detectHorizontalSeparators(data, canvas.width, canvas.height);
      
      // Extraer viñetas basándose en las líneas de separación
      const vinettes = extractVinetteImages(img, canvas, ctx, separatorLines);
      
      onVinettesExtracted(vinettes);
      
    } catch (error) {
      console.error('Error extrayendo viñetas:', error);
      // Si falla la extracción automática, usar la imagen completa
      onVinettesExtracted([imageUrl]);
    } finally {
      setIsProcessing(false);
    }
  };

  const detectHorizontalSeparators = (
    data: Uint8ClampedArray, 
    width: number, 
    height: number
  ): number[] => {
    const separators: number[] = [];
    const threshold = 0.8; // 80% de píxeles blancos/claros para considerar línea separadora
    const minSeparatorHeight = 5; // Mínimo 5px de altura para considerar separador

    for (let y = 0; y < height - minSeparatorHeight; y++) {
      let lightPixelCount = 0;
      let totalPixels = 0;
      
      // Analizar varias líneas consecutivas para detectar separadores
      for (let dy = 0; dy < minSeparatorHeight; dy++) {
        const currentY = y + dy;
        if (currentY >= height) break;
        
        for (let x = 0; x < width; x++) {
          const idx = (currentY * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          
          // Calcular brillo
          const brightness = (r + g + b) / 3;
          
          if (brightness > 200) { // Píxel claro/blanco
            lightPixelCount++;
          }
          totalPixels++;
        }
      }
      
      const lightRatio = lightPixelCount / totalPixels;
      
      if (lightRatio > threshold) {
        // Verificar que no hayamos detectado un separador muy cerca
        const lastSeparator = separators[separators.length - 1];
        if (!lastSeparator || y - lastSeparator > 50) { // Mínimo 50px entre separadores
          separators.push(y);
        }
      }
    }

    return separators;
  };

  const extractVinetteImages = (
    img: HTMLImageElement,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    separators: number[]
  ): string[] => {
    const vinettes: string[] = [];
    
    // Si no se detectaron separadores, intentar división uniforme
    if (separators.length === 0) {
      return divideUniformly(img, canvas, ctx);
    }

    // Crear viñetas basadas en separadores detectados
    const regions = getSeparatedRegions(separators, img.height);
    
    regions.forEach((region) => {
      const vinetteCanvas = document.createElement('canvas');
      const vinetteCtx = vinetteCanvas.getContext('2d');
      
      if (!vinetteCtx) return;
      
      const regionHeight = region.end - region.start;
      
      // Configurar canvas para la viñeta
      vinetteCanvas.width = img.width;
      vinetteCanvas.height = regionHeight;
      
      // Extraer la región
      vinetteCtx.drawImage(
        img,
        0, region.start,           // sx, sy
        img.width, regionHeight,   // sWidth, sHeight
        0, 0,                      // dx, dy
        img.width, regionHeight    // dWidth, dHeight
      );
      
      // Convertir a data URL
      const dataUrl = vinetteCanvas.toDataURL('image/png', 0.9);
      vinettes.push(dataUrl);
    });

    return vinettes.length > 0 ? vinettes : [imageUrl];
  };

  const getSeparatedRegions = (separators: number[], totalHeight: number) => {
    const regions: { start: number; end: number }[] = [];
    
    // Primera región: desde el inicio hasta el primer separador
    if (separators.length > 0) {
      regions.push({ start: 0, end: separators[0] });
      
      // Regiones intermedias
      for (let i = 0; i < separators.length - 1; i++) {
        regions.push({
          start: separators[i] + 5, // Saltar el separador
          end: separators[i + 1]
        });
      }
      
      // Última región: desde el último separador hasta el final
      regions.push({
        start: separators[separators.length - 1] + 5,
        end: totalHeight
      });
    }
    
    // Filtrar regiones muy pequeñas (menos de 50px de altura)
    return regions.filter(region => (region.end - region.start) > 50);
  };

  const divideUniformly = (
    img: HTMLImageElement,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D
  ): string[] => {
    const vinettes: string[] = [];
    
    // Estimar número de viñetas basándose en proporciones típicas
    // Típicamente las tiras cómicas tienen entre 3-6 viñetas
    const estimatedVinettes = Math.max(3, Math.min(6, Math.round(img.height / (img.width * 0.3))));
    const vinetteHeight = Math.floor(img.height / estimatedVinettes);
    
    for (let i = 0; i < estimatedVinettes; i++) {
      const vinetteCanvas = document.createElement('canvas');
      const vinetteCtx = vinetteCanvas.getContext('2d');
      
      if (!vinetteCtx) continue;
      
      const startY = i * vinetteHeight;
      const actualHeight = (i === estimatedVinettes - 1) 
        ? img.height - startY  // Última viñeta toma el resto
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
      
      const dataUrl = vinetteCanvas.toDataURL('image/png', 0.9);
      vinettes.push(dataUrl);
    }
    
    return vinettes;
  };

  // Componente no renderiza nada visible, solo procesa
  return null;
};

export default VinetteConverter;