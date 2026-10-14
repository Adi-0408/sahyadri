import { uploadImageToCloudinary } from './cloudinaryUpload';

/**
 * Upload single image/document to Bunny.net Edge Storage
 */
export const uploadImageToBunnyStorage = (
  file: File,
  folder: string = 'properties',
  onProgress?: (progress: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const storageZoneName = import.meta.env.VITE_BUNNY_STORAGE_ZONE_NAME || 'sahyadri-properties';
    const accessKey = import.meta.env.VITE_BUNNY_STORAGE_ACCESS_KEY;
    const storageEndpoint = (import.meta.env.VITE_BUNNY_STORAGE_ENDPOINT || 'https://storage.bunnycdn.com').replace(/\/$/, '');
    const cdnUrl = (import.meta.env.VITE_BUNNY_STORAGE_CDN_URL || `https://${storageZoneName}.b-cdn.net`).replace(/\/$/, '');

    if (!accessKey) {
      reject(new Error('Bunny Storage Access Key is missing.'));
      return;
    }

    const cleanFileName = file.name
      .replace(/[\u{1F600}-\u{1FFFF}]/gu, '')
      .replace(/[^\w\s.-]/g, '')
      .replace(/\s+/g, '_')
      .trim() || 'file';

    const uniqueName = `${Date.now()}_${cleanFileName}`;
    const uploadPath = `${folder}/${uniqueName}`;
    const uploadUrl = `${storageEndpoint}/${storageZoneName}/${uploadPath}`;

    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('AccessKey', accessKey);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded * 100) / e.total);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const publicUrl = `${cdnUrl}/${uploadPath}`;
        resolve(publicUrl);
      } else {
        reject(new Error(`Bunny storage upload failed: HTTP ${xhr.status} ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during Bunny Storage upload.'));
    };

    xhr.send(file);
  });
};

/**
 * Upload multiple files to Bunny.net Storage with Cloudinary fallback
 */
export const uploadMultipleImagesToBunnyStorage = async (
  files: File[] | FileList,
  folder: string = 'properties'
): Promise<string[]> => {
  const fileArray = Array.from(files);
  const results = await Promise.allSettled(
    fileArray.map((file) => uploadImageSmart(file, folder))
  );

  const urls: string[] = [];
  results.forEach((res) => {
    if (res.status === 'fulfilled' && res.value) {
      urls.push(res.value);
    }
  });

  return urls;
};

/**
 * Test if an image URL is publicly accessible in the browser
 */
export const checkUrlAccessible = (url: string, timeoutMs: number = 2500): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    let isDone = false;

    const timer = setTimeout(() => {
      if (!isDone) {
        isDone = true;
        resolve(false);
      }
    }, timeoutMs);

    img.onload = () => {
      if (!isDone) {
        isDone = true;
        clearTimeout(timer);
        resolve(true);
      }
    };

    img.onerror = () => {
      if (!isDone) {
        isDone = true;
        clearTimeout(timer);
        resolve(false);
      }
    };

    img.src = url;
  });
};

/**
 * Smart Upload for Images / Posters / Documents:
 * Uploads to Bunny.net Storage as primary. Verifies that the CDN URL actually resolves;
 * if Bunny Pull Zone is not active (returning 403), seamlessly uses working CDN URL
 * so that posters and images never show broken/fallback pictures!
 */
export const uploadImageSmart = async (
  file: File,
  folder: string = 'properties',
  onProgress?: (progress: number) => void
): Promise<string> => {
  const hasBunnyConfig = Boolean(import.meta.env.VITE_BUNNY_STORAGE_ACCESS_KEY);

  if (hasBunnyConfig) {
    try {
      // 1. Direct upload to Bunny.net Edge Storage
      const bunnyUrl = await uploadImageToBunnyStorage(file, folder, onProgress);
      // 2. Test if Bunny CDN URL is actually accessible in the browser (Pull Zone active)
      const isAccessible = await checkUrlAccessible(bunnyUrl, 2000);
      if (isAccessible) {
        return bunnyUrl;
      }
      console.warn('Bunny Storage upload succeeded, but Pull Zone is not connected yet (returns 403/NXDOMAIN). Falling back to Cloudinary CDN so image displays on screen.');
    } catch (bunnyErr) {
      console.warn('Bunny storage upload error, trying fallback:', bunnyErr);
    }
  }

  // Fallback to Cloudinary so image is 100% visible and never turns into old hero-background
  return await uploadImageToCloudinary(file, folder, onProgress);
};

/**
 * Upload video to Bunny.net Stream (for 99. Shots / Reels)
 */
export const uploadVideoToBunnyStream = async (
  file: File,
  title: string,
  onProgress?: (progress: number) => void
): Promise<{
  videoUrl: string;
  thumbnailUrl: string;
  directPlayUrl: string;
  hlsUrl: string;
  videoId: string;
}> => {
  const libraryId = import.meta.env.VITE_BUNNY_STREAM_LIBRARY_ID;
  const apiKey = import.meta.env.VITE_BUNNY_STREAM_API_KEY;
  const streamCdnUrl = (import.meta.env.VITE_BUNNY_STREAM_CDN_URL || 'https://video.bunnycdn.com').replace(/\/$/, '');

  if (!libraryId || !apiKey) {
    throw new Error('Bunny Stream Library ID or API Key is missing in .env');
  }

  // 1. Create Video Object in Bunny Stream
  const createRes = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
    method: 'POST',
    headers: {
      AccessKey: apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title: title || file.name })
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to initialize Bunny Stream video: ${errText}`);
  }

  const createData = await createRes.json();
  const videoId = createData.guid;

  // 2. Upload Video Binary via PUT
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`, true);
    xhr.setRequestHeader('AccessKey', apiKey);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded * 100) / e.total);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // Direct MP4 / HLS / Player URL and Thumbnail
        const directPlayUrl = `https://iframe.mediadelivery.net/play/${libraryId}/${videoId}`;
        const videoUrl = `${streamCdnUrl}/${videoId}/play_720p.mp4`;
        const hlsUrl = `${streamCdnUrl}/${videoId}/playlist.m3u8`;
        const thumbnailUrl = `${streamCdnUrl}/${videoId}/thumbnail.jpg`;
        resolve({ videoUrl, thumbnailUrl, directPlayUrl, hlsUrl, videoId });
      } else {
        reject(new Error(`Bunny Stream upload failed: HTTP ${xhr.status}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during Bunny Stream upload'));
    };

    xhr.send(file);
  });
};

/**
 * Smart Video Uploader for 99. Shots & Reels:
 * Stores directly on Bunny.net Stream (Library 766382) and Bunny.net Storage (sahyadri-properties).
 * Returns both direct MP4, HLS stream playlist (.m3u8), and Bunny player URLs for maximum compatibility.
 */
export const uploadVideoSmart = async (
  file: File,
  folder: string = 'shots',
  onProgress?: (progress: number) => void
): Promise<{
  videoUrl: string;
  thumbnailUrl: string;
  hlsUrl?: string;
  directPlayUrl?: string;
  videoId?: string;
}> => {
  // 1. Primary: Upload to Bunny.net Stream (Library 766382)
  const streamLibId = import.meta.env.VITE_BUNNY_STREAM_LIBRARY_ID;
  const streamKey = import.meta.env.VITE_BUNNY_STREAM_API_KEY;

  if (streamLibId && streamKey) {
    try {
      const streamRes = await uploadVideoToBunnyStream(file, file.name, onProgress);
      return {
        videoUrl: streamRes.videoUrl,
        thumbnailUrl: streamRes.thumbnailUrl,
        hlsUrl: streamRes.hlsUrl,
        directPlayUrl: streamRes.directPlayUrl,
        videoId: streamRes.videoId
      };
    } catch (streamErr) {
      console.warn('Bunny Stream upload failed, attempting Bunny Edge Storage fallback:', streamErr);
    }
  }

  // 2. Secondary: Direct Bunny.net Edge Storage (sahyadri-properties)
  if (import.meta.env.VITE_BUNNY_STORAGE_ACCESS_KEY) {
    try {
      const bunnyStorageUrl = await uploadImageToBunnyStorage(file, folder, onProgress);
      return {
        videoUrl: bunnyStorageUrl,
        thumbnailUrl: ''
      };
    } catch (bunnyErr) {
      console.warn('Bunny Storage upload error for video:', bunnyErr);
    }
  }

  // 3. Fallback only if all Bunny services are unreachable
  const fallbackUrl = await uploadImageToCloudinary(file, folder, onProgress);
  return { videoUrl: fallbackUrl, thumbnailUrl: '' };
};
