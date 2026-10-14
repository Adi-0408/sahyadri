export const uploadImageToCloudinary = (
  file: File,
  folder = 'real-estate',
  onProgress?: (progress: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dysagkcmd';
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'realestateupload';

    if (!cloudName || !uploadPreset) {
      reject(new Error('Cloudinary is not configured.'));
      return;
    }

    // Determine upload URL based on file type
    const isVideo = file.type.startsWith('video/');
    const resourceType = isVideo ? 'video' : 'image';
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    // Sanitize filename to prevent character encoding issues
    const safeName = file.name
      .replace(/[\u{1F600}-\u{1FFFF}]/gu, '') // remove emojis
      .replace(/[^\w\s.-]/g, '')               // remove special chars
      .replace(/\s+/g, '_')                    // replace spaces with underscores
      .replace(/_+/g, '_')                     // collapse multiple underscores
      .trim() || 'file';

    const renamedFile = new File([file], safeName, { type: file.type });

    formData.append('file', renamedFile);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', folder);

    xhr.open('POST', url, true);

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
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response.secure_url);
        } catch {
          reject(new Error('Failed to parse Cloudinary response.'));
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.error?.message || 'Upload failed.'));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during upload.'));
    };

    xhr.send(formData);
  });
};

export const uploadMultipleImages = async (
  files: File[] | FileList,
  folder = 'real-estate'
): Promise<string[]> => {
  const fileArray = Array.from(files);
  const promises = fileArray.map((file) => uploadImageToCloudinary(file, folder));
  const results = await Promise.allSettled(promises);
  
  const urls: string[] = [];
  const failures: any[] = [];
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      urls.push(result.value);
    } else {
      failures.push({ index, reason: (result as PromiseRejectedResult).reason });
    }
  });

  if (failures.length > 0) {
    console.warn(`${failures.length} files failed to upload.`);
    if (urls.length === 0) {
      throw new Error('All image uploads failed.');
    }
  }
  return urls;
};
