import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Upload, Trash2, LogOut, Shield } from "lucide-react";
import {
  sanitizeInput,
  validateDate,
  validateFileType,
  validateFileSize,
  generateSecureFilename,
  isVideoFile
} from "@/lib/security";

const REPO_OWNER = 'albertomayday';
const REPO_NAME = 'Porterias';
const GITHUB_TOKEN = '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'; // GitHub token with repo access

interface ComicStrip {
  id: string;
  title: string | null;
  image_url: string;
  publish_date: string;
}

const Admin = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  
  const [strips, setStrips] = useState<ComicStrip[]>([]);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [publishDate, setPublishDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Check if Supabase is available
  if (!supabase) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-4">Panel de Administración</h1>
            <p className="text-muted-foreground mb-4">
              No disponible en producción. Las tiras se cargan desde datos locales.
            </p>
            <p className="text-sm text-muted-foreground">
              Para administrar tiras, usa el entorno de desarrollo local.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password === 'Bac2317?') {
      setIsLoggedIn(true);
      toast.success("Acceso concedido");
      setPassword("");
      loadStrips();
    } else {
      toast.error("Contraseña incorrecta");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setStrips([]);
  };

  const loadStrips = async () => {
    try {
      const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/public/data/strips.json`, {
        headers: { Authorization: `token ${GITHUB_TOKEN}` }
      });
      if (!response.ok) throw new Error('Failed to fetch strips');
      const data = await response.json();
      const content = JSON.parse(atob(data.content));
      setStrips(content.strips);
    } catch (error: any) {
      console.error(error);
      toast.error("Error cargando tiras: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type (images and videos)
      if (!validateFileType(file)) {
        toast.error("Solo se permiten imágenes (JPG, PNG, GIF, WebP) y videos (MP4, WebM, OGG)");
        e.target.value = '';
        return;
      }
      
      // Validate file size (max 50MB)
      if (!validateFileSize(file)) {
        toast.error(`El archivo no debe superar ${SECURITY_CONFIG.MAX_FILE_SIZE_MB}MB`);
        e.target.value = '';
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast.error("Selecciona una imagen o video");
      return;
    }
    
    // Sanitize title input
    const sanitizedTitle = title.trim().slice(0, 200); // Max 200 chars
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(publishDate)) {
      toast.error("Formato de fecha inválido");
      return;
    }

    setUploading(true);

    try {
      // Determine media type
      const mediaType = isVideoFile(selectedFile) ? 'video' : 'image';
      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
      const timestamp = Date.now();
      const fileName = `strip-${publishDate}-${timestamp}.${fileExt}`;

      // Upload file to GitHub
      const base64Content = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(selectedFile);
      });

      const uploadResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/public/strips/${fileName}`, {
        method: 'PUT',
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Add strip: ${sanitizedTitle || fileName}`,
          content: base64Content
        })
      });

      if (!uploadResponse.ok) throw new Error('Failed to upload file');

      // Get current JSON
      const jsonResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/public/data/strips.json`, {
        headers: { Authorization: `token ${GITHUB_TOKEN}` }
      });
      const jsonData = await jsonResponse.json();
      const currentContent = JSON.parse(atob(jsonData.content));

      // Generate new ID
      const maxId = currentContent.strips.reduce((max: number, s: any) => {
        const num = parseInt(s.id.replace(/\D/g, ''));
        return num > max ? num : max;
      }, 0);
      const newId = `strip-${String(maxId + 1).padStart(3, '0')}`;

      const newStrip = {
        id: newId,
        title: sanitizedTitle || null,
        image_url: mediaType === 'image' ? `/Porterias/strips/${fileName}` : null,
        video_url: mediaType === 'video' ? `/Porterias/strips/${fileName}` : null,
        media_type: mediaType,
        publish_date: publishDate,
      };

      currentContent.strips.unshift(newStrip);
      const newJsonContent = btoa(JSON.stringify(currentContent, null, 2));

      const updateResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/public/data/strips.json`, {
        method: 'PUT',
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Add strip: ${sanitizedTitle || fileName}`,
          content: newJsonContent,
          sha: jsonData.sha
        })
      });

      if (!updateResponse.ok) throw new Error('Failed to update JSON');

      toast.success("Tira subida correctamente");
      setTitle("");
      setPublishDate(new Date().toISOString().split('T')[0]);
      setSelectedFile(null);
      loadStrips(); // reload
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (strip: ComicStrip) => {
    if (!confirm("¿Eliminar esta tira?")) return;

    try {
      // Delete file
      const urlParts = (strip.image_url || strip.video_url || '').split('/');
      const fileName = urlParts[urlParts.length - 1];
      if (fileName) {
        const fileResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/public/strips/${fileName}`, {
          headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });
        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/public/strips/${fileName}`, {
            method: 'DELETE',
            headers: {
              Authorization: `token ${GITHUB_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message: `Remove strip: ${strip.id}`,
              sha: fileData.sha
            })
          });
        }
      }

      // Update JSON
      const jsonResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/public/data/strips.json`, {
        headers: { Authorization: `token ${GITHUB_TOKEN}` }
      });
      const jsonData = await jsonResponse.json();
      const currentContent = JSON.parse(atob(jsonData.content));
      currentContent.strips = currentContent.strips.filter((s: any) => s.id !== strip.id);
      const newJsonContent = btoa(JSON.stringify(currentContent, null, 2));
      await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/public/data/strips.json`, {
        method: 'PUT',
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Remove strip: ${strip.id}`,
          content: newJsonContent,
          sha: jsonData.sha
        })
      });

      toast.success("Tira eliminada");
      loadStrips();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  // Login screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center py-16 px-6">
          <div className="w-full max-w-md">
            <div className="border-2 border-primary p-8 bg-card shadow-editorial">
              <div className="text-center mb-8">
                <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h1 className="text-3xl font-bold">Panel Admin</h1>
                <p className="text-muted-foreground mt-2">
                  Introduce la contraseña para acceder
                </p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  className="border-2 border-primary"
                  autoFocus
                />
                <Button 
                  type="submit" 
                  className="w-full border-2 border-primary" 
                  variant="outline"
                  disabled={authLoading}
                >
                  {authLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </form>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
        <main className="flex-grow flex items-center justify-center py-16 px-6">
          <div className="w-full max-w-md text-center">
            <div className="border-2 border-primary p-8 bg-card shadow-editorial">
              <Lock className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <h1 className="text-2xl font-bold mb-2">Acceso Denegado</h1>
              <p className="text-muted-foreground mb-6">
                Tu cuenta no tiene permisos de administrador.
              </p>
              <Button onClick={handleLogout} variant="outline" className="border-2 border-primary">
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow py-16 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="flex justify-between items-start mb-12">
            <div>
              <div className="inline-block border-2 border-primary px-6 py-2 mb-4">
                <p className="text-xs tracking-[0.3em] uppercase font-medium">
                  Panel de Administración
                </p>
              </div>
              <h1 className="text-5xl font-bold tracking-tight">
                Gestión de Tiras
              </h1>
            </div>
            <Button onClick={handleLogout} variant="outline" className="border-2 border-primary">
              <LogOut className="mr-2 h-4 w-4" />
              Salir
            </Button>
          </div>

          {/* Upload form */}
          <div className="border-2 border-primary p-8 bg-card shadow-editorial mb-12">
            <h2 className="text-2xl font-bold mb-6">Subir Nueva Tira</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 uppercase tracking-wider">
                  Título (opcional)
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="border-2 border-primary"
                  placeholder="El Nuevo Inquilino"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 uppercase tracking-wider">
                  Fecha de Publicación
                </label>
                <Input
                  type="date"
                  value={publishDate}
                  onChange={(e) => setPublishDate(e.target.value)}
                  className="border-2 border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 uppercase tracking-wider">
                  Imagen o Video de la Tira
                </label>
                <Input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="border-2 border-primary"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={uploading}
                className="w-full border-2 border-primary"
                variant="outline"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Subir Tira
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Strips list */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Tiras Publicadas</h2>
            {strips.map((strip) => (
              <div
                key={strip.id}
                className="border-2 border-primary p-6 bg-card shadow-newspaper flex gap-6"
              >
                <img
                  src={strip.image_url}
                  alt={strip.title || "Tira"}
                  className="w-32 h-32 object-cover"
                />
                <div className="flex-grow">
                  <h3 className="text-lg font-bold mb-2">
                    {strip.title || "Sin título"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(strip.publish_date).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDelete(strip)}
                  className="border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {strips.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No hay tiras publicadas aún
              </p>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Admin;