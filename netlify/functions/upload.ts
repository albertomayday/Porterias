import { Handler } from '@netlify/functions';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = 'albertomaydayjhondoe';
const GITHUB_REPO = 'Porterias';
const GITHUB_BRANCH = 'main';

interface UploadRequest {
  file: string; // base64
  fileName: string;
  title: string;
  publishDate: string;
  mediaType: 'image' | 'video';
}

export const handler: Handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    if (!GITHUB_TOKEN) {
      throw new Error('GitHub token not configured in Netlify environment');
    }

    const body: UploadRequest = JSON.parse(event.body || '{}');
    const { file, fileName, title, publishDate, mediaType } = body;

    // Upload file to GitHub
    const filePath = `src/assets/strips/${fileName}`;
    await uploadToGitHub(filePath, file, `Add ${mediaType}: ${title || fileName}`);

    // Update strips.json
    const stripsJson = await fetchGitHubFile('public/data/strips.json');
    const strips = JSON.parse(Buffer.from(stripsJson.content, 'base64').toString());
    
    const maxId = strips.strips.reduce((max: number, s: any) => {
      const num = parseInt(s.id.replace(/\D/g, ''));
      return num > max ? num : max;
    }, 0);
    const newId = `strip-${String(maxId + 1).padStart(3, '0')}`;

    const newStrip = {
      id: newId,
      title: title || null,
      image_url: mediaType === 'image' ? `/Porterias/assets/strips/${fileName}` : null,
      video_url: mediaType === 'video' ? `/Porterias/assets/strips/${fileName}` : null,
      media_type: mediaType,
      publish_date: publishDate,
    };
    
    strips.strips.unshift(newStrip);
    const updatedStripsJson = JSON.stringify(strips, null, 2);

    await uploadToGitHub(
      'public/data/strips.json',
      Buffer.from(updatedStripsJson).toString('base64'),
      `Update strips.json: add ${newId}`,
      stripsJson.sha
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        url: `/Porterias/assets/strips/${fileName}`,
        id: newId
      }),
    };
  } catch (error: any) {
    console.error('Upload error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};

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

async function uploadToGitHub(path: string, base64Content: string, message: string, sha?: string): Promise<void> {
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
