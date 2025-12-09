import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import { toast } from "sonner";

interface ComicStrip {
  id: string;
  title: string | null;
  image_url: string;
  publish_date: string;
  media_type?: 'image' | 'video' | 'audio';
  video_url?: string;
  audio_url?: string;
}

interface StripViewerProps {
  strips: ComicStrip[];
}

const StripViewer = ({ strips }: StripViewerProps) => {
  if (!strips || strips.length === 0) {
    return null;
  }

  const latestStrip = strips[0];
  
  // Detectar el tipo de medio basado en la URL
  const getMediaType = (strip: ComicStrip): 'image' | 'video' | 'audio' => {
    if (strip.media_type) return strip.media_type;
    if (strip.video_url || (strip.image_url && strip.image_url.endsWith('.mp4'))) return 'video';
    if (strip.audio_url || (strip.image_url && strip.image_url.match(/\.(mp3|wav|ogg)$/))) return 'audio';
    return 'image';
  };
  
  const mediaType = getMediaType(latestStrip);
  const mediaUrl = latestStrip.video_url || latestStrip.audio_url || latestStrip.image_url || '';

  const downloadMedia = async () => {
    try {
      if (mediaType === 'video' || mediaType === 'audio') {
        // Descarga directa para video/audio
        toast.info("Descargando archivo...");
        const link = document.createElement('a');
        link.href = mediaUrl;
        link.download = `${latestStrip.title || 'Porteria'}_${latestStrip.publish_date}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Descarga iniciada");
      } else {
        // PDF para imágenes
        toast.info("Generando PDF a ancho completo...");
        
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = latestStrip.image_url;
        });

        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 10;
        const maxWidth = pageWidth - (2 * margin);
        
        const aspectRatio = img.height / img.width;
        const imageHeight = maxWidth * aspectRatio;
        
        const finalHeight = Math.min(imageHeight, pageHeight - (2 * margin));
        const finalWidth = finalHeight / aspectRatio;
        
        const x = (pageWidth - finalWidth) / 2;
        const y = (pageHeight - finalHeight) / 2;

        pdf.addImage(img, "PNG", x, y, finalWidth, finalHeight);
        
        const fileName = `${latestStrip.title || 'Porteria'}_${latestStrip.publish_date}.pdf`;
        pdf.save(fileName);
        
        toast.success("PDF descargado a ancho completo");
      }
    } catch (error) {
      console.error("Error descargando:", error);
      toast.error("Error al descargar");
    }
  };

  return (
    <section className="py-16 px-6">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-block border-2 border-primary px-6 py-2">
            <p className="text-xs tracking-[0.3em] uppercase font-medium">
              Última edición
            </p>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            {new Date(latestStrip.publish_date).toLocaleDateString('es-ES', { 
              day: 'numeric',
              month: 'long',
              year: 'numeric' 
            })}
          </h2>
          {latestStrip.title && (
            <p className="text-lg text-muted-foreground italic">{latestStrip.title}</p>
          )}
        </div>

        {/* Comic strip / Video / Audio */}
        <div className="relative bg-card border-2 border-primary p-4 md:p-8 shadow-editorial">
          {mediaType === 'video' && (
            <div className="space-y-2">
              <video
                src={mediaUrl}
                controls
                controlsList="nodownload"
                className="w-full h-auto rounded bg-background"
                style={{ maxHeight: '70vh' }}
                poster={latestStrip.image_url !== mediaUrl ? latestStrip.image_url : undefined}
                preload="metadata"
              >
                Tu navegador no soporta video HTML5.
              </video>
              <p className="text-xs text-muted-foreground text-center">
                Formato: MP4 • Usa los controles para reproducir, pausar y ajustar volumen
              </p>
            </div>
          )}
          
          {mediaType === 'audio' && (
            <div className="space-y-4">
              {latestStrip.image_url && !latestStrip.image_url.match(/\.(mp3|wav|ogg|mp4)$/) && (
                <div className="flex justify-center bg-muted/30 p-8 rounded">
                  <img
                    src={latestStrip.image_url}
                    alt={`Portada de ${latestStrip.title || 'audio'}`}
                    className="max-w-md w-full h-auto rounded shadow-lg"
                  />
                </div>
              )}
              <div className="bg-background p-4 rounded">
                <audio
                  src={mediaUrl}
                  controls
                  controlsList="nodownload"
                  className="w-full"
                  preload="metadata"
                >
                  Tu navegador no soporta audio HTML5.
                </audio>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Formato: Audio • Usa los controles para reproducir y ajustar volumen
              </p>
            </div>
          )}
          
          {mediaType === 'image' && (
            <img
              src={latestStrip.image_url}
              alt={`Tira cómica del ${latestStrip.publish_date}`}
              className="w-full h-auto"
            />
          )}
        </div>

        {/* Download Button */}
        <div className="flex justify-center mt-8">
          <Button
            onClick={downloadMedia}
            size="lg"
            className="gap-2 shadow-editorial"
          >
            <Download className="h-5 w-5" />
            {mediaType === 'image' ? 'Descargar PDF a ancho completo' : 'Descargar archivo'}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default StripViewer;
