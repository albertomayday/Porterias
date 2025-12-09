import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Download } from "lucide-react";
import jsPDF from "jspdf";

interface ComicStrip {
  id: string;
  title: string | null;
  image_url: string;
  publish_date: string;
}

const Archive = () => {
  const navigate = useNavigate();
  const [strips, setStrips] = useState<ComicStrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  useEffect(() => {
    loadStrips();
  }, []);

  const loadStrips = async () => {
    try {
      // Datos locales como respaldo
      const localStrips = [
        { id: "local-001", title: "El Nuevo Inquilino", image_url: "/Porterias/strips/strip-001.png", publish_date: "2025-12-01" },
        { id: "local-002", title: "Paquetería Confusa", image_url: "/Porterias/strips/strip-002.png", publish_date: "2025-12-02" },
        { id: "local-003", title: "Reunión de Consorcio", image_url: "/Porterias/strips/strip-003.png", publish_date: "2025-12-03" },
        { id: "local-004", title: "La Conexión WiFi", image_url: "/Porterias/strips/strip-004.png", publish_date: "2025-12-04" },
        { id: "local-005", title: "El Ascensor Averiado", image_url: "/Porterias/strips/strip-005.png", publish_date: "2025-11-28" },
        { id: "local-006", title: "Horario de Basura", image_url: "/Porterias/strips/strip-006.png", publish_date: "2025-11-27" },
        { id: "local-007", title: "Fiesta Nocturna", image_url: "/Porterias/strips/strip-007.png", publish_date: "2025-11-26" },
        { id: "local-008", title: "El Perro del 5º", image_url: "/Porterias/strips/strip-008.png", publish_date: "2025-11-25" },
        { id: "local-009", title: "Reforma en el Ático", image_url: "/Porterias/strips/strip-009.png", publish_date: "2025-11-24" },
        { id: "local-010", title: "El Cartero Sustituto", image_url: "/Porterias/strips/strip-010.png", publish_date: "2025-11-23" },
        { id: "local-011", title: "Apagón General", image_url: "/Porterias/strips/strip-011.png", publish_date: "2025-11-22" },
        { id: "local-012", title: "La Vecina Chismosa", image_url: "/Porterias/strips/strip-012.png", publish_date: "2025-11-21" },
        { id: "local-013", title: "Navidad Anticipada", image_url: "/Porterias/strips/strip-013.png", publish_date: "2025-11-20" },
        { id: "local-014", title: "Buzón Atascado", image_url: "/Porterias/strips/strip-014.png", publish_date: "2025-11-19" },
        { id: "local-015", title: "Día de Mudanza", image_url: "/Porterias/strips/strip-015.png", publish_date: "2025-11-18" },
        { id: "local-016", title: "Visita del Técnico", image_url: "/Porterias/strips/strip-016.png", publish_date: "2025-11-17" },
        { id: "local-017", title: "La Llave Perdida", image_url: "/Porterias/strips/strip-017.png", publish_date: "2025-11-16" },
        { id: "local-018", title: "Inspección Sanitaria", image_url: "/Porterias/strips/strip-018.png", publish_date: "2025-11-15" },
        { id: "local-019", title: "El Misterio del 3º B", image_url: "/Porterias/strips/strip-019.png", publish_date: "2025-11-14" },
        { id: "local-020", title: "Primera Tira", image_url: "/Porterias/strips/strip-020.png", publish_date: "2025-11-13" }
      ];

      // Si no hay cliente de Supabase (GitHub Pages), usar solo datos locales
      if (!supabase) {
        setStrips(localStrips);
        return;
      }

      const { data, error } = await supabase
        .from("comic_strips")
        .select("*")
        .order("publish_date", { ascending: false });

      if (error) {
        // Si hay error, usar datos locales
        setStrips(localStrips);
        toast.info("Usando archivo local");
      } else {
        // Combinar datos de Supabase con locales
        const allStrips = [...(data || []), ...localStrips];
        setStrips(allStrips.length > 0 ? allStrips : localStrips);
      }
    } catch (error: any) {
      toast.error("Error al cargar tiras");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const downloadAsPDF = async (strip: ComicStrip, e: React.MouseEvent) => {
    e.stopPropagation();
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

  // Group strips by month
  const stripsByMonth = strips.reduce((acc, strip) => {
    const monthKey = new Date(strip.publish_date).toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long' 
    });
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(strip);
    return acc;
  }, {} as Record<string, ComicStrip[]>);

  const months = Object.keys(stripsByMonth);

  const filteredStrips = selectedMonth === "all" 
    ? strips 
    : stripsByMonth[selectedMonth] || [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow py-16 px-6">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-block border-2 border-primary px-6 py-2 mb-4">
              <p className="text-xs tracking-[0.3em] uppercase font-medium">
                Archivo Histórico
              </p>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4">
              Todas las Ediciones
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Explora el catálogo completo de tiras desde el primer día
            </p>
          </div>

          {/* Month filter */}
          {months.length > 0 && (
            <div className="mb-12 flex flex-wrap justify-center gap-3">
              <Button
                variant={selectedMonth === "all" ? "default" : "outline"}
                onClick={() => setSelectedMonth("all")}
                className="border-2 border-primary"
              >
                Todas
              </Button>
              {months.map((month) => (
                <Button
                  key={month}
                  variant={selectedMonth === month ? "default" : "outline"}
                  onClick={() => setSelectedMonth(month)}
                  className="border-2 border-primary capitalize"
                >
                  {month}
                </Button>
              ))}
            </div>
          )}

          {/* Grid of strips */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredStrips.map((strip) => (
              <div key={strip.id} className="group">
                <button
                  onClick={() => navigate(`/`)}
                  className="w-full text-left"
                >
                  <div className="border-2 border-primary bg-card overflow-hidden shadow-newspaper hover:shadow-editorial transition-all">
                    <img
                      src={strip.image_url}
                      alt={strip.title || `Tira del ${strip.publish_date}`}
                      className="w-full h-64 object-cover grayscale group-hover:grayscale-0 transition-all"
                    />
                    <div className="p-6 border-t-2 border-primary">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-lg font-bold mb-2">
                            {new Date(strip.publish_date).toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                          {strip.title && (
                            <p className="text-sm text-muted-foreground italic">
                              {strip.title}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={(e) => downloadAsPDF(strip, e)}
                          title="Descargar PDF para RRSS"
                          className="shrink-0 border-primary hover:bg-primary hover:text-primary-foreground"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            ))}
          </div>

          {/* Empty state */}
          {filteredStrips.length === 0 && (
            <div className="text-center py-16">
              <p className="text-xl text-muted-foreground">
                {selectedMonth === "all" 
                  ? "No hay tiras disponibles aún" 
                  : "No hay tiras disponibles para este mes"}
              </p>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Archive;
