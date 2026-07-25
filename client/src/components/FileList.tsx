import React from 'react';
import { FileCard, FileItem } from './FileCard';

export interface FileListProps {
  files: FileItem[];
  onSelectFile?: (file: FileItem) => void;
  onDeleteFile?: (url: string) => void;
  onUpdateFile?: (url: string) => void;
  onHistoryFile?: (url: string) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  isOwner?: boolean;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  onSelectFile,
  onDeleteFile,
  onUpdateFile,
  onHistoryFile,
  isLoading = false,
  emptyMessage = 'No files found.',
  isOwner = true,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
        <span className="ml-3 text-slate-400 text-sm">Loading files...</span>
      </div>
    );
  }

  if (!files || files.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-900/40 rounded-xl border border-slate-800">
        <p className="text-slate-400 text-sm font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {files.map((file, index) => (
        <FileCard
          key={file.url || index}
          file={file}
          onSelect={onSelectFile}
          onDelete={onDeleteFile}
          onUpdate={onUpdateFile}
          onHistory={onHistoryFile}
          isOwner={isOwner}
        />
      ))}
    </div>
  );
};

export default FileList;
