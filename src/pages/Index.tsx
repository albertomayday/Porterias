import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StripViewer from "@/components/StripViewer";
import ArchiveSlider from "@/components/ArchiveSlider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ComicStrip {
  id: string;
  title: string | null;
  image_url: string;
  publish_date: string;
  media_type?: 'image' | 'video' | 'audio';
  video_url?: string;
  audio_url?: string;
}

const Index = () => {
  const navigate = useNavigate();
  const [strips, setStrips] = useState<ComicStrip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStrips();
  }, []);

  const loadStrips = async () => {
    try {
      // Datos locales como respaldo
      const localStrips = [
        {
          id: "local-001",
          title: "El Nuevo Inquilino",
          image_url: "./strips/strip-001.png",
          publish_date: "2025-12-01"
        },
        {
          id: "local-002",
          title: "Paquetería Confusa",
          image_url: "./strips/strip-002.png",
          publish_date: "2025-12-02"
        },
        {
          id: "local-003",
          title: "Reunión de Consorcio",
          image_url: "./strips/strip-003.png",
          publish_date: "2025-12-03"
        },
        {
          id: "local-004",
          title: "La Conexión WiFi",
          image_url: "./strips/strip-004.png",
          publish_date: "2025-12-04"
        }
      ];

      const { data, error } = await supabase
        .from("comic_strips")
        .select("*")
        .order("publish_date", { ascending: false });

      if (error) {
        // Si hay error con Supabase, usar datos locales
        setStrips(localStrips);
      } else {
        // Combinar datos de Supabase con locales
        const allStrips = [...(data || []), ...localStrips];
        setStrips(allStrips.length > 0 ? allStrips : localStrips);
      }
    } catch (error: any) {
      // Si falla completamente, usar datos locales
      const localStrips = [
        {
          id: "local-001",
          title: "El Nuevo Inquilino",
          image_url: "./strips/strip-001.png",
          publish_date: "2025-12-01"
        },
        {
          id: "local-002",
          title: "Paquetería Confusa",
          image_url: "./strips/strip-002.png",
          publish_date: "2025-12-02"
        }
      ];
      setStrips(localStrips);
      console.log("Usando datos locales:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (strips.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">No hay tiras publicadas aún</h2>
            <p className="text-muted-foreground">Vuelve pronto para ver el contenido</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const latestStrip = strips[0];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        {/* Latest strip */}
        <StripViewer strips={strips} />

        {/* Archive slider */}
        {strips.length > 1 && (
          <ArchiveSlider
            strips={strips.slice(1).map(s => ({
              id: s.id,
              imageUrl: s.image_url,
              date: s.publish_date,
              title: s.title || undefined,
              mediaType: s.media_type,
            }))}
            onStripClick={(id) => navigate(`/archivo`)}
          />
        )}

        {/* Call to action */}
        <section className="py-16 px-6 text-center">
          <div className="container mx-auto max-w-2xl">
            <div className="border-2 border-primary p-12 bg-card shadow-editorial">
              <h3 className="text-3xl font-bold mb-4">
                No te pierdas ninguna edición
              </h3>
              <p className="text-muted-foreground mb-6">
                Visita el archivo completo para recorrer todas las tiras desde el principio
              </p>
              <button
                onClick={() => navigate('/archivo')}
                className="inline-block border-2 border-primary px-8 py-3 font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                Ver Archivo Completo
              </button>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
