# Soporte de Medios - Videos y Audio

## Características

Este sistema ahora soporta no solo imágenes, sino también **videos** y **audio** en formato MP4.

## Formatos Soportados

- **Imágenes**: PNG, JPG, GIF, WebP
- **Videos**: MP4
- **Audio**: MP4, MP3, WAV, OGG

## Cómo Usar

### 1. Añadir una Tira con Imagen (comportamiento anterior)

```typescript
{
  id: "strip-001",
  title: "Mi Tira Cómica",
  image_url: "./strips/strip-001.png",
  publish_date: "2025-12-09"
}
```

### 2. Añadir una Tira con Video

```typescript
{
  id: "strip-002",
  title: "Video Animado",
  image_url: "./strips/thumbnail-002.png",  // Thumbnail opcional
  video_url: "./strips/video-002.mp4",      // URL del video
  media_type: "video",
  publish_date: "2025-12-09"
}
```

O simplemente usando `image_url` con extensión .mp4:

```typescript
{
  id: "strip-003",
  title: "Video Simple",
  image_url: "./strips/video-003.mp4",
  publish_date: "2025-12-09"
}
```

### 3. Añadir una Tira con Audio

```typescript
{
  id: "strip-004",
  title: "Podcast de Portería",
  image_url: "./strips/cover-004.png",      // Portada/cover art
  audio_url: "./strips/audio-004.mp4",      // URL del audio
  media_type: "audio",
  publish_date: "2025-12-09"
}
```

## Detección Automática

El sistema detecta automáticamente el tipo de medio:
- Si tiene `video_url` o `image_url` termina en `.mp4` → **Video**
- Si tiene `audio_url` o `image_url` termina en `.mp3/.wav/.ogg` → **Audio**
- En caso contrario → **Imagen**

## Descarga

- **Imágenes**: Se descargan como PDF a ancho completo (A4)
- **Videos/Audio**: Se descargan directamente como archivo MP4

## Visualización en el Archivo

Las tiras con video o audio muestran un icono indicador:
- 🎬 Icono de video para videos
- 🎵 Icono de música para audio

## Base de Datos Supabase

Para soportar estos campos en Supabase, añade las siguientes columnas a tu tabla `comic_strips`:

```sql
ALTER TABLE comic_strips
ADD COLUMN media_type TEXT CHECK (media_type IN ('image', 'video', 'audio')),
ADD COLUMN video_url TEXT,
ADD COLUMN audio_url TEXT;
```

## Ejemplo Completo

```typescript
const strips = [
  {
    id: "001",
    title: "Imagen Clásica",
    image_url: "./strips/comic-001.png",
    publish_date: "2025-12-01"
  },
  {
    id: "002",
    title: "Animación",
    image_url: "./strips/thumb-002.png",
    video_url: "./strips/animation-002.mp4",
    media_type: "video",
    publish_date: "2025-12-02"
  },
  {
    id: "003",
    title: "Entrevista",
    image_url: "./strips/cover-003.png",
    audio_url: "./strips/interview-003.mp4",
    media_type: "audio",
    publish_date: "2025-12-03"
  }
];
```
