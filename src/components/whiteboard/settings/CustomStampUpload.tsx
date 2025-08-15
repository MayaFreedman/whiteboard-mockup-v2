import React, { useState, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { Button } from '../../ui/button';
import { Upload, X, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '../../ui/alert';
import { addCustomStamp, removeCustomStamp, getStorageInfo, isCustomStampsSupported } from '../../../utils/customStamps';
import { toast } from 'sonner';
interface CustomStampUploadProps {
  onStampAdded?: () => void; // Callback to refresh the stamp list
}
export interface CustomStampUploadHandle {
  openFileDialog: () => void;
}
export const CustomStampUpload = forwardRef<CustomStampUploadHandle, CustomStampUploadProps>(({
  onStampAdded
}, ref) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => ({
    openFileDialog: () => fileInputRef.current?.click()
  }), []);
  const supported = isCustomStampsSupported();
  const storageInfo = getStorageInfo();
  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    console.log('🚀 handleFileUpload called with files:', files.length);
    if (!files.length) {
      console.log('❌ No files provided');
      return;
    }
    
    const file = files[0];
    console.log('📁 Processing file:', file.name, 'type:', file.type, 'size:', file.size);
    
    setIsUploading(true);
    try {
      console.log('🔄 Calling addCustomStamp...');
      await addCustomStamp(file);
      console.log('✅ addCustomStamp completed');
      toast.success(`"${file.name}" added to custom stamps`);
      onStampAdded?.();
    } catch (error) {
      console.error('❌ Error in handleFileUpload:', error);
      const message = error instanceof Error ? error.message : 'Failed to upload stamp';
      toast.error(message);
    } finally {
      console.log('🏁 Upload process finished');
      setIsUploading(false);
    }
  }, [onStampAdded]);
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📤 handleInputChange called, files:', e.target.files?.length || 0);
    if (e.target.files) {
      console.log('📂 Files found, calling handleFileUpload');
      handleFileUpload(e.target.files);
    } else {
      console.log('❌ No files in input');
    }
  }, [handleFileUpload]);
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);
  if (!supported) {
    return <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Custom stamps are not available in this browser environment.
        </AlertDescription>
      </Alert>;
  }
  return <div className="space-y-3">
      {/* Upload Area */}
      <div className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
        <input type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleInputChange} disabled={isUploading} ref={fileInputRef} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
        
        <div className="flex flex-col items-center gap-2 text-center">
          <Upload className="w-6 h-6 text-muted-foreground" />
          <div className="text-sm">
            <span className="font-medium">Upload a Custom Stamp</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Click to upload or drag and drop<br />
            PNG, JPEG files only • Max 1MB
          </div>
        </div>
        
        {isUploading && <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
            <div className="text-sm font-medium">Processing...</div>
          </div>}
      </div>
      
      {/* Storage Info */}
      <div className="text-xs text-muted-foreground space-y-1">
        
        {storageInfo.usage > 0.8 && <div className="text-warning text-xs">
            Storage nearly full. Oldest stamps will be removed automatically.
          </div>}
      </div>
    </div>;
});