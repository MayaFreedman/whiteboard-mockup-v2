import React, { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
type BackgroundImageUploadProps = {
  onImageSelected: (dataUrl: string) => void;
  className?: string;
};
export const BackgroundImageUpload: React.FC<BackgroundImageUploadProps> = ({
  onImageSelected,
  className
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const openFileDialog = () => inputRef.current?.click();
  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (result?.startsWith('data:image')) {
        onImageSelected(result);
      }
    };
    reader.readAsDataURL(file);
  };
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files);
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };
  return <div className={className}>
      <div role="button" tabIndex={0} aria-label="Upload background image" onClick={openFileDialog} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && openFileDialog()} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} className={`w-full h-28 rounded-md border-2 border-dashed ${dragActive ? 'border-primary/60 bg-muted' : 'border-border bg-background/50'} text-muted-foreground flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background`}>
        <UploadCloud className="h-5 w-5" aria-hidden="true" />
        <div className="text-sm font-medium">Click to add a Custom Background, or Drag and Drop</div>
        
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onChange} />
    </div>;
};