import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, Trash2, Lock, LogOut, Shield, Download } from "lucide-react";
import { User, Session } from "@supabase/supabase-js";
import {
  SECURITY_CONFIG,
  sanitizeInput,
  validateEmail,
  validateDate,
  validateFileType,
  validateFileSize,
  generateSecureFilename,
  isVideoFile
} from "@/lib/security";

interface ComicStrip {
  id: string;
  title: string | null;
  image_url: string;
  publish_date: string;
}

const Admin = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  
  const [strips, setStrips] = useState<ComicStrip[]>([]);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [publishDate, setPublishDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Set up auth state listener
  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Check admin role with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            checkAdminRole(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load strips when admin is confirmed
  useEffect(() => {
    if (!supabase) return;
    if (isAdmin) {
      loadStrips();
    }
  }, [isAdmin]);

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

  const checkAdminRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (error) throw error;
      setIsAdmin(!!data);
    } catch (error: unknown) {
      console.error("Error checking admin role:", error.message);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check lockout
    if (lockoutTime && Date.now() < lockoutTime) {
      const remainingSeconds = Math.ceil((lockoutTime - Date.now()) / 1000);
      toast.error(`Demasiados intentos. Espera ${remainingSeconds} segundos`);
      return;
    }
    
    // Input validation
    if (!email || !password) {
      toast.error("Introduce email y contraseña");
      return;
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Email no válido");
      return;
    }
    
    // Password minimum length
    if (password.length < 6) {
      toast.error("Contraseña demasiado corta");
      return;
    }

    setAuthLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        // Increment failed attempts
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        
        // Lock after 5 failed attempts for 5 minutes
        if (newAttempts >= 5) {
          setLockoutTime(Date.now() + 5 * 60 * 1000);
          toast.error("Demasiados intentos fallidos. Bloqueado por 5 minutos");
        } else {
          toast.error("Credenciales incorrectas");
        }
        throw error;
      }
      
      // Reset on success
      setLoginAttempts(0);
      setLockoutTime(null);
      toast.success("Sesión iniciada");
      
      // Clear password from state
      setPassword("");
    } catch (error: unknown) {
      // Error already handled above
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    toast.success("Sesión cerrada");
  };

  const loadStrips = async () => {
    try {
      const { data, error } = await supabase
        .from("comic_strips")
        .select("*")
        .order("publish_date", { ascending: false });

      if (error) throw error;
      setStrips(data || []);
    } catch (error: unknown) {
      toast.error("Error al cargar tiras: " + error.message);
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

      // Download file with proper name for manual upload
      const url = URL.createObjectURL(selectedFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Load current strips.json to generate next ID
      const response = await fetch('/Porterias/data/strips.json');
      const currentStrips = await response.json();
      const maxId = currentStrips.strips.reduce((max: number, s: { id: string }) => {
        const num = parseInt(s.id.replace(/\D/g, ''));
        return num > max ? num : max;
      }, 0);
      const newId = `strip-${String(maxId + 1).padStart(3, '0')}`;

      // Create JSON entry
      const newStrip = {
        id: newId,
        title: sanitizedTitle || null,
        image_url: mediaType === 'image' ? `/Porterias/strips/${fileName}` : null,
        video_url: mediaType === 'video' ? `/Porterias/strips/${fileName}` : null,
        media_type: mediaType,
        publish_date: publishDate,
      };

      // Generate instructions
      const instructions = `
✅ Archivo descargado: ${fileName}

📋 Pasos para completar:

1. Mueve el archivo a:
   public/strips/${fileName}

2. Edita public/data/strips.json y añade al inicio del array "strips":
${JSON.stringify(newStrip, null, 2)}

3. Ejecuta en terminal:
   git add public/strips/${fileName} public/data/strips.json
   git commit -m "Add strip: ${sanitizedTitle || fileName}"
   git push && npm run deploy

O simplemente ejecuta:
   npm run upload
      `.trim();

      // Copy to clipboard
      await navigator.clipboard.writeText(instructions);
      
      toast.success("Archivo descargado e instrucciones copiadas al portapapeles");
      alert(instructions);

      setTitle("");
      setPublishDate(new Date().toISOString().split('T')[0]);
      setSelectedFile(null);
    } catch (error: unknown) {
      toast.error("Error: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (strip: ComicStrip) => {
    if (!confirm("¿Eliminar esta tira?")) return;

    try {
      // Extract filename from URL
      const urlParts = (strip.image_url || '').split('/');
      const fileName = urlParts[urlParts.length - 1];

      const instructions = `
📋 Para eliminar la tira "${strip.title || strip.id}":

1. Elimina el archivo:
   rm public/strips/${fileName}

2. Edita public/data/strips.json y elimina la entrada con id: "${strip.id}"

3. Ejecuta:
   git add public/strips/ public/data/strips.json
   git commit -m "Remove strip: ${strip.id}"
   git push && npm run deploy
      `.trim();

      await navigator.clipboard.writeText(instructions);
      toast.success("Instrucciones copiadas al portapapeles");
      alert(instructions);
    } catch (error: unknown) {
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
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center py-16 px-6">
          <div className="w-full max-w-md">
            <div className="border-2 border-primary p-8 bg-card shadow-editorial">
              <div className="text-center mb-8">
                <Lock className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h1 className="text-3xl font-bold">Panel Admin</h1>
                <p className="text-muted-foreground mt-2">
                  Inicia sesión para acceder
                </p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="border-2 border-primary"
                  autoFocus
                />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  className="border-2 border-primary"
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

  // Not admin screen
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
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