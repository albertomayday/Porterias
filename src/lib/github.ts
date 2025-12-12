// GitHub API utilities for file uploads
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const GITHUB_OWNER = 'albertomaydayjhondoe';
const GITHUB_REPO = 'Porterias';
const GITHUB_BRANCH = 'main';
const IS_PRODUCTION = import.meta.env.PROD;
const NETLIFY_FUNCTION_URL = '/.netlify/functions/upload';

interface FileUpload {
  path: string;
  content: string;
  message: string;
}

export async function uploadToGitHub(file: File, metadata: {
  title: string;
  publishDate: string;
  mediaType: 'image' | 'video';
}): Promise<{ success: boolean; url: string; error?: string }> {
  try {
    // Read file as base64
    const base64Content = await fileToBase64(file);
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const timestamp = Date.now();
    const fileName = `strip-${metadata.publishDate}-${timestamp}.${fileExt}`;

    // Use serverless function in production, direct API in development
    if (IS_PRODUCTION || !GITHUB_TOKEN) {
      return await uploadViaNetlify(base64Content, fileName, metadata);
    }

    const filePath = `src/assets/strips/${fileName}`;

    // Get current strips.json
    const stripsJson = await fetchGitHubFile('public/data/strips.json');
    const strips = JSON.parse(atob(stripsJson.content));
    
    // Generate new ID
    const maxId = strips.strips.reduce((max: number, s: any) => {
      const num = parseInt(s.id.replace(/\D/g, ''));
      return num > max ? num : max;
    }, 0);
    const newId = `strip-${String(maxId + 1).padStart(3, '0')}`;

    // Add new strip
    const newStrip = {
      id: newId,
      title: metadata.title || null,
      image_url: metadata.mediaType === 'image' ? `/Porterias/assets/strips/${fileName}` : null,
      video_url: metadata.mediaType === 'video' ? `/Porterias/assets/strips/${fileName}` : null,
      media_type: metadata.mediaType,
      publish_date: metadata.publishDate,
    };
    
    strips.strips.unshift(newStrip);
    const updatedStripsJson = JSON.stringify(strips, null, 2);

    // Upload file to GitHub
    await uploadFile(filePath, base64Content, `Add ${metadata.mediaType}: ${metadata.title || fileName}`);
    
    // Update strips.json
    await uploadFile(
      'public/data/strips.json',
      btoa(updatedStripsJson),
      `Update strips.json: add ${newId}`,
      stripsJson.sha
    );

    return {
      success: true,
      url: `/Porterias/assets/strips/${fileName}`
    };
  } catch (error: any) {
    return {
      success: false,
      url: '',
      error: error.message
    };
  }
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function fetchGitHubFile(path: string): Promise<{ content: string; sha: string }> {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
  }

  return response.json();
}

async function uploadViaNetlify(
  base64Content: string,
  fileName: string,
  metadata: { title: string; publishDate: string; mediaType: 'image' | 'video' }
): Promise<{ success: boolean; url: string; error?: string }> {
  try {
    const response = await fetch(NETLIFY_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: base64Content,
        fileName,
        title: metadata.title,
        publishDate: metadata.publishDate,
        mediaType: metadata.mediaType,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    return await response.json();
  } catch (error: any) {
    return {
      success: false,
      url: '',
      error: error.message,
    };
  }
}

async function uploadFile(path: string, base64Content: string, message: string, sha?: string): Promise<void> {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
  const body: any = {
    message,
    content: base64Content,
    branch: GITHUB_BRANCH
  };

  if (sha) {
    body.sha = sha;
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to upload ${path}: ${error.message || response.statusText}`);
  }
}

export async function deleteFromGitHub(strip: any): Promise<{ success: boolean; error?: string }> {
  try {
    if (!GITHUB_TOKEN) {
      throw new Error('GitHub token not configured');
    }

    // Extract filename from URL
    const urlParts = (strip.image_url || strip.video_url).split('/');
    const fileName = urlParts[urlParts.length - 1];
    const filePath = `src/assets/strips/${fileName}`;

    // Get file SHA
    const fileData = await fetchGitHubFile(filePath);
    
    // Delete file
    await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Delete strip: ${strip.id}`,
        sha: fileData.sha,
        branch: GITHUB_BRANCH
      })
    });

    // Update strips.json
    const stripsJson = await fetchGitHubFile('public/data/strips.json');
    const strips = JSON.parse(atob(stripsJson.content));
    strips.strips = strips.strips.filter((s: any) => s.id !== strip.id);
    const updatedStripsJson = JSON.stringify(strips, null, 2);

    await uploadFile(
      'public/data/strips.json',
      btoa(updatedStripsJson),
      `Remove strip: ${strip.id}`,
      stripsJson.sha
    );

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}
