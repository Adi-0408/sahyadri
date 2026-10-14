import React, { useCallback, useState } from 'react';
import { UploadCloud, X, Video } from 'lucide-react';

export interface FileUploadProps {
  accept?: string;
  maxFiles?: number;
  label?: string;
  onUpload?: (files: File[]) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  accept = "image/*,video/*", 
  maxFiles = 5,
  label = "Drag & drop files here, or click to browse",
  onUpload
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const processFiles = (newFiles: File[]) => {
    const validFiles = newFiles.slice(0, maxFiles - files.length);
    if (validFiles.length > 0) {
      const updatedFiles = [...files, ...validFiles];
      setFiles(updatedFiles);
      
      const newPreviews = validFiles.map(file => URL.createObjectURL(file));
      setPreviews([...previews, ...newPreviews]);
      
      if (onUpload) {
        onUpload(updatedFiles);
      }
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  }, [files, maxFiles]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    const updatedFiles = [...files];
    updatedFiles.splice(index, 1);
    setFiles(updatedFiles);

    const updatedPreviews = [...previews];
    URL.revokeObjectURL(updatedPreviews[index]);
    updatedPreviews.splice(index, 1);
    setPreviews(updatedPreviews);
    
    if (onUpload) {
      onUpload(updatedFiles);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <div 
        className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl transition-colors ${
          dragActive ? 'border-primary bg-primary/5' : 'border-slate-300 hover:bg-slate-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept={accept}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleChange}
        />
        <div className="flex flex-col items-center justify-center text-slate-500 gap-3">
          <UploadCloud className={`w-10 h-10 ${dragActive ? 'text-primary' : 'text-slate-400'}`} />
          <p className="text-sm font-medium text-center">{label}</p>
          <p className="text-xs text-slate-400">Max {maxFiles} files allowed. Max size 5MB.</p>
        </div>
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {previews.map((preview, idx) => {
            const isVideo = files[idx]?.type.startsWith('video/');
            return (
              <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                {isVideo ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    <Video className="w-8 h-8 mb-2" />
                    <span className="text-xs text-center px-2 truncate w-full">{files[idx]?.name}</span>
                  </div>
                ) : (
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button 
                    type="button" 
                    onClick={() => removeFile(idx)}
                    className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
