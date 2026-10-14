/**
 * Optimizes a Cloudinary image URL for faster loading by applying transformations.
 * 
 * @param url The original Cloudinary image URL
 * @param width Target width in pixels (default: 800)
 * @param quality Quality setting for the image (default: 'auto:good')
 * @returns The optimized Cloudinary URL, or the original URL if not a Cloudinary URL
 */
export const optimizeCloudinaryUrl = (url: string, width: number = 800, quality: string = 'auto:good'): string => {
  if (!url) return '';
  
  // Check if it's a valid Cloudinary URL
  if (!url.includes('res.cloudinary.com')) {
    return url;
  }

  // Check if it already has transformations applied
  // A typical Cloudinary URL format: 
  // https://res.cloudinary.com/<cloud_name>/image/upload/v<version>/<public_id>
  // We want to insert transformations before the version or public_id:
  // https://res.cloudinary.com/<cloud_name>/image/upload/c_scale,w_800,q_auto,f_auto/v<version>/<public_id>
  
  try {
    const parts = url.split('/upload/');
    if (parts.length === 2) {
      const baseUrl = parts[0] + '/upload/';
      const imagePath = parts[1];
      
      // If there are already transformations, return as is to avoid breaking it
      // Transformations usually look like c_scale, w_500 etc.
      if (imagePath.includes('c_') || imagePath.includes('w_') || imagePath.includes('q_')) {
        return url;
      }
      
      const transformations = `c_scale,w_${width},q_${quality},f_auto/`;
      return `${baseUrl}${transformations}${imagePath}`;
    }
  } catch (error) {
    console.error('Error optimizing Cloudinary URL:', error);
  }
  
  return url;
};

/**
 * Validates an image URL to ensure it is not a local Android/iOS path stored by mistake.
 * If invalid or empty, returns the fallback image.
 */
export const getValidImageUrl = (
  url?: string, 
  fallback: string = 'https://placehold.co/600x450/f1f5f9/64748b?text=No+Image+Available'
): string => {
  if (!url) return fallback;
  
  // Check for local device paths mistakenly saved to DB
  if (url.startsWith('/data/user/') || url.startsWith('file://') || url.startsWith('content://')) {
    return fallback;
  }
  
  return url;
};
