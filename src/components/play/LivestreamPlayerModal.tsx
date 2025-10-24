import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Livestream } from '../../types';

interface LivestreamPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  livestream: Livestream;
}

export const LivestreamPlayerModal: React.FC<LivestreamPlayerModalProps> = ({
  isOpen,
  onClose,
  livestream
}) => {
  const videoId = useMemo(() => {
    if (!livestream.youtubeUrl) return '';
    try {
      const url = new URL(livestream.youtubeUrl);
      if (url.hostname === 'youtu.be') {
        return url.pathname.replace('/', '');
      }
      if (url.searchParams.get('v')) {
        return url.searchParams.get('v') as string;
      }
      // Fallback for embed urls
      const parts = url.pathname.split('/');
      const idx = parts.findIndex((p) => p === 'embed');
      if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
      return '';
    } catch {
      return '';
    }
  }, [livestream.youtubeUrl]);

  const embedSrc = useMemo(() => {
    if (!videoId) return '';
    const params = new URLSearchParams({
      autoplay: '1',
      modestbranding: '1',
      rel: '0',
      playsinline: '1'
    });
    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  }, [videoId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="w-full max-w-5xl bg-black rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-zinc-900 to-gray-900">
          <h3 className="text-white font-bold text-sm sm:text-xl truncate pr-2 sm:pr-4">{livestream.title}</h3>
          <button aria-label="Close" onClick={onClose} className="p-1.5 sm:p-2 hover:bg-zinc-800 rounded-lg transition-colors flex-shrink-0">
            <X className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
          </button>
        </div>
        <div className="aspect-video w-full bg-black">
          {embedSrc ? (
            <iframe
              title={livestream.title}
              src={embedSrc}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-zinc-400 text-sm sm:text-base">Invalid YouTube URL</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};


