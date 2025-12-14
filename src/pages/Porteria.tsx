import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Image as ImageIcon, Film } from "lucide-react";

interface Strip {
  id: string;
  title: string;
  publish_date: string;
  image_url?: string;
  video_url?: string;
  media_type: "image" | "video" | "audio";
}

const Porteria = () => {
  const [strips, setStrips] = useState<Strip[]>([]);
  const [selectedStrip, setSelectedStrip] = useState<Strip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/Porteria/data/strips.json')
      .then(res => res.json())
      .then(data => {
        setStrips(data.strips || []);
        if (data.strips && data.strips.length > 0) {
          setSelectedStrip(data.strips[0]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading strips:', err);
        setLoading(false);
      });
  }, []);

  const renderMedia = (strip: Strip) => {
    if (strip.media_type === "video" && strip.video_url) {
      return (
        <video 
          key={strip.id}
          controls 
          className="w-full h-auto rounded-lg shadow-lg"
          poster={strip.image_url}
        >
          <source src={strip.video_url} type="video/mp4" />
          Tu navegador no soporta el tag de video.
        </video>
      );
    } else if (strip.image_url) {
      return (
        <img 
          src={strip.image_url} 
          alt={strip.title}
          className="w-full h-auto rounded-lg shadow-lg"
        />
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              El Buzón
            </h1>
            <p className="text-lg text-muted-foreground">
              Contenido de video y multimedia de la portería
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Cargando contenido...</p>
            </div>
          ) : strips.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No hay contenido disponible</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main viewer */}
              <div className="lg:col-span-2">
                {selectedStrip && (
                  <Card className="border-2 border-primary">
                    <CardContent className="p-6">
                      <div className="mb-4">
                        <h2 className="text-2xl font-bold mb-2">
                          {selectedStrip.title}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {new Date(selectedStrip.publish_date).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      {renderMedia(selectedStrip)}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar with thumbnails */}
              <div className="lg:col-span-1">
                <h3 className="text-xl font-bold mb-4">Archivo</h3>
                <div className="space-y-4">
                  {strips.map((strip) => (
                    <Card 
                      key={strip.id}
                      className={`cursor-pointer transition-all hover:border-primary ${
                        selectedStrip?.id === strip.id ? 'border-primary border-2' : ''
                      }`}
                      onClick={() => setSelectedStrip(strip)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-20 h-20 bg-accent rounded flex items-center justify-center">
                            {strip.media_type === "video" ? (
                              <Film className="w-8 h-8 text-primary" />
                            ) : (
                              <ImageIcon className="w-8 h-8 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm mb-1 truncate">
                              {strip.title}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {new Date(strip.publish_date).toLocaleDateString('es-ES')}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                                {strip.media_type === "video" ? "Video" : "Imagen"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Porteria;
