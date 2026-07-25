import React from 'react';

export interface FileItem {
  url: string;
  category?: string;
  sender?: string;
  timestamp?: number;
}

export interface FileCardProps {
  file: FileItem;
  onSelect?: (file: FileItem) => void;
  onDelete?: (url: string) => void;
  onUpdate?: (url: string) => void;
  onHistory?: (url: string) => void;
  isOwner?: boolean;
}

export const FileCard: React.FC<FileCardProps> = ({
  file,
  onSelect,
  onDelete,
  onUpdate,
  onHistory,
  isOwner = true,
}) => {
  const getCategoryInfo = (catString?: string) => {
    if (!catString) return { name: 'General', tags: [] };
    const parts = catString.split('|');
    let name = parts[0].trim();
    if (name) {
      name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    } else {
      name = 'General';
    }
    const tags = parts.length > 1 && parts[1] ? parts[1].split(',') : [];
    return { name, tags };
  };

  const { name: catName, tags } = getCategoryInfo(file.category);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg hover:border-cyan-500/50 transition-all duration-200 group">
      <div className="flex items-center justify-between mb-3">
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          {catName}
        </span>
        {tags.map((tag, idx) => (
          <span key={idx} className="ml-1 text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
            {tag}
          </span>
        ))}
      </div>

      <p className="text-sm font-medium text-slate-200 truncate mb-2 font-mono" title={file.url}>
        {file.url}
      </p>

      {file.sender && (
        <p className="text-xs text-slate-400 truncate mb-3">
          Sender: <span className="font-mono text-slate-300">{file.sender}</span>
        </p>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
        {onSelect && (
          <button
            onClick={() => onSelect(file)}
            className="flex-1 py-1.5 px-3 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-medium rounded-lg transition-colors"
          >
            View / Decrypt
          </button>
        )}
        {isOwner && onUpdate && (
          <button
            onClick={() => onUpdate(file.url)}
            className="py-1.5 px-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium rounded-lg transition-colors"
            title="Update Version"
          >
            Update
          </button>
        )}
        {onHistory && (
          <button
            onClick={() => onHistory(file.url)}
            className="py-1.5 px-2.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-medium rounded-lg transition-colors"
            title="Version History"
          >
            History
          </button>
        )}
        {isOwner && onDelete && (
          <button
            onClick={() => onDelete(file.url)}
            className="py-1.5 px-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-medium rounded-lg transition-colors"
            title="Delete File"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
};

export default FileCard;
