import React, { useState } from 'react';
import { ImagePlus, Video, X, UploadCloud, Film } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { uploadImageSmart } from '../../utils/bunnyUpload';

export interface MediaUploadSectionProps {
  categoryType: string;
  onChange?: (urls: string[]) => void;
  onVideoChange?: (url: string) => void;
}

interface UploadedFile {
  id: string;
  name: string;
  type: 'image' | 'video';
  url: string;
  progress: number;
  status: 'uploading' | 'complete';
}

export const MediaUploadSection: React.FC<MediaUploadSectionProps> = ({ 
  categoryType,
  onChange,
  onVideoChange
}) => {
  const { t } = useTranslation();
  const [mediaList, setMediaList] = useState<UploadedFile[]>([]);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const videoInputRef = React.useRef<HTMLInputElement>(null);

  const triggerCallbacks = (list: UploadedFile[]) => {
    const completedImages = list
      .filter((m) => m.type === 'image' && m.status === 'complete')
      .map((m) => m.url);
    const completedVideo = list
      .find((m) => m.type === 'video' && m.status === 'complete')?.url || '';

    if (onChange) {
      onChange(completedImages);
    }
    if (onVideoChange) {
      onVideoChange(completedVideo);
    }
  };

  const isStorageConfigured = Boolean(
    import.meta.env.VITE_BUNNY_STORAGE_ACCESS_KEY ||
    (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME && import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET)
  );

  const startUpload = async (newFile: File, type: 'image' | 'video') => {
    if (!isStorageConfigured) {
      alert(t('forms.storageNotConfiguredNotice', 'Cloud storage is currently not configured. Photos and videos are optional and can be skipped.'));
      return;
    }

    const fileId = Math.random().toString(36).substring(2, 9);
    const tempUrl = URL.createObjectURL(newFile);
    
    const initialFile: UploadedFile = {
      id: fileId,
      name: newFile.name,
      type,
      url: tempUrl,
      progress: 0,
      status: 'uploading'
    };

    setMediaList((prev) => [...prev, initialFile]);

    try {
      const secureUrl = await uploadImageSmart(newFile, 'properties', (progress) => {
        setMediaList((prev) => 
          prev.map((f) => 
            f.id === fileId ? { ...f, progress } : f
          )
        );
      });

      // Revoke local preview URL
      URL.revokeObjectURL(tempUrl);

      setMediaList((prev) => {
        const updatedList = prev.map((f) => 
          f.id === fileId ? { ...f, url: secureUrl, progress: 100, status: 'complete' as const } : f
        );
        triggerCallbacks(updatedList);
        return updatedList;
      });
    } catch (error: any) {
      console.error('Upload failed for file:', newFile.name, error);
      URL.revokeObjectURL(tempUrl);
      setMediaList((prev) => prev.filter((f) => f.id !== fileId));
      alert(`${t('forms.uploadFailed', 'Upload failed')}: ${newFile.name}. (${t('forms.mediaOptionalBadge', 'Optional')})`);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach((file) => startUpload(file, 'image'));
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      startUpload(e.target.files[0], 'video');
    }
  };

  const removeMedia = (id: string, url: string) => {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
    setMediaList((prev) => {
      const updatedList = prev.filter((m) => m.id !== id);
      triggerCallbacks(updatedList);
      return updatedList;
    });
  };

  const categoryKey = categoryType ? categoryType.toLowerCase() : 'bungalow';
  const translatedCategory = t(`categories.${categoryKey}`, categoryType || 'Bungalow');

  return (
    <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 bg-orange-50/30 border-b border-orange-100/50">
        <div className="flex items-center gap-3">
          <div className="text-blue-600">
            <ImagePlus className="w-5 h-5" fill="currentColor" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 font-serif tracking-wide">{t('forms.mediaGallery')}</h3>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
          {t('forms.mediaOptionalBadge', 'Optional')}
        </span>
      </div>

      <div className="p-6 flex flex-col gap-6 text-left">
        {/* Optional Informational Notice */}
        <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-blue-800 flex items-start gap-2.5">
          <span className="font-semibold text-blue-900 shrink-0">ℹ️ {t('forms.mediaOptionalBadge', 'Optional')}:</span>
          <span>{t('forms.mediaOptionalNotice', 'Photos and videos are optional. If not uploaded, a default property showcase image will be displayed.')}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Image Upload Area */}
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-widest font-semibold text-slate-500 flex items-center justify-between">
              <span>{t('forms.imagesLabel', { category: translatedCategory })}</span>
              <span className="text-[11px] font-medium text-slate-400 normal-case">({t('forms.mediaOptionalBadge', 'Optional')})</span>
            </label>
            <div 
              onClick={() => imageInputRef.current?.click()}
              className="border border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors group"
            >
              <input
                ref={imageInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
                onClick={(e) => e.stopPropagation()}
              />
              <ImagePlus className="w-8 h-8 text-slate-700" />
              <span className="text-sm font-bold text-slate-800">{t('forms.dragImages')}</span>
              <span className="text-xs text-slate-500">{t('forms.supportImagesDesc')}</span>
            </div>
          </div>

          {/* Video Upload Area */}
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-widest font-semibold text-slate-500 flex items-center justify-between">
              <span>{t('forms.videoTour')}</span>
              <span className="text-[11px] font-medium text-slate-400 normal-case">({t('forms.mediaOptionalBadge', 'Optional')})</span>
            </label>
            <div 
              onClick={() => videoInputRef.current?.click()}
              className="border border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors group"
            >
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleVideoChange}
                onClick={(e) => e.stopPropagation()}
              />
              <Video className="w-8 h-8 text-slate-700" />
              <span className="text-sm font-bold text-slate-800">{t('forms.dragVideo')}</span>
              <span className="text-xs text-slate-500">{t('forms.supportVideoDesc')}</span>
            </div>
          </div>
        </div>

        {/* Upload Progress & Previews */}
        <AnimatePresence>
          {mediaList.length > 0 && (
            <div className="flex flex-col gap-4 mt-2">
              <h4 className="text-xs uppercase tracking-wider font-bold text-slate-500">
                {t('forms.uploadedMediaCount', { count: mediaList.length })}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {mediaList.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative group aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm"
                  >
                    {item.status === 'uploading' ? (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-white z-20">
                        <UploadCloud className="w-7 h-7 mb-2 animate-bounce" />
                        <span className="text-xs font-bold">{t('forms.uploading')}</span>
                        <div className="w-full bg-white/20 h-1 rounded-full mt-2 overflow-hidden">
                          <motion.div 
                            className="bg-primary h-full" 
                            initial={{ width: 0 }} 
                            animate={{ width: `${item.progress}%` }} 
                          />
                        </div>
                        <span className="text-[10px] opacity-75 mt-1">{item.progress}%</span>
                      </div>
                    ) : null}

                    {item.type === 'video' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-300 p-2">
                        <Film className="w-8 h-8 text-primary mb-1" />
                        <span className="text-xs font-medium truncate max-w-full text-center px-1">
                          {item.name}
                        </span>
                      </div>
                    ) : (
                      <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                    )}

                    <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        type="button"
                        onClick={() => removeMedia(item.id, item.url)}
                        className="p-1.5 bg-black/60 hover:bg-red-500 text-white rounded-full transition-colors cursor-pointer shadow-md"
                        title={t('forms.removeFile') as string}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
