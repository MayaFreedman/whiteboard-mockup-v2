
import React, { useState, useCallback } from 'react';
import { Button } from '../../ui/button';
import { Upload, X, AlertCircle } from 'lucide-react';
import { addCustomStamp, getStorageInfo } from '../../../utils/customStamps';
import { toast } from 'sonner';

interface CustomStampUploadProps {
  onUploadSuccess: () => void;
}

export const CustomStampUpload: React.FC<CustomStampUploadProps> = ({ onUploadSuccess }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsUploading(true);

    try {
      await addCustomStamp(file);
      toast.success(`Custom stamp "${file.name}" uploaded successfully!`);
      onUploadSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload stamp';
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  }, [onUploadSuccess]);

  const handleFileInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
    // Reset input so same file can be selected again
    event.target.value = '';
  }, [handleFiles]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    handleFiles(event.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
  }, []);

  const storageInfo = getStorageInfo();
  const isNearLimit = storageInfo.count >= storageInfo.maxCount * 0.8;

  return (
    <div className="space-y-3">
      {/* Storage info */}
      <div className="text-xs text-muted-foreground">
        {storageInfo.count}/{storageInfo.maxCount} stamps • {Math.round(storageInfo.totalSize / 1024 / 1024 * 10) / 10}MB used
        {isNearLimit && (
          <div className="flex items-center gap-1 text-amber-600 mt-1">
            <AlertCircle className="w-3 h-3" />
            <span>Storage nearly full</span>
          </div>
        )}
      </div>

      {/* Upload area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer ${
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/30'
        } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById('stamp-file-input')?.click()}
      >
        <input
          id="stamp-file-input"
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          onChange={handleFileInput}
          className="hidden"
          disabled={isUploading}
        />
        
        <div className="flex flex-col items-center gap-2 text-center">
          <Upload className={`w-6 h-6 ${isUploading ? 'animate-pulse' : ''}`} />
          <div className="text-sm">
            {isUploading ? (
              <span>Uploading...</span>
            ) : (
              <>
                <div className="font-medium">Upload Custom Stamp</div>
                <div className="text-xs text-muted-foreground mt-1">
                  PNG or JPEG • Max 1MB • Drag & drop or click
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
