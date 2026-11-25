import { useState } from 'react';
import { Film, Image as ImageIcon, Maximize2, Minimize2, X } from 'lucide-react';
import type { MediaLightboxPayload } from '../lib/media.ts';

interface MediaLightboxModalProps {
  media: MediaLightboxPayload;
  onClose: () => void;
}

export function MediaLightboxModal({ media, onClose }: MediaLightboxModalProps) {
  const [mode, setMode] = useState<'image' | 'video'>(media.initialMode);
  const [zoomed, setZoomed] = useState(false);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#161816]/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Media viewer for ${media.title}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-[#FFFBF0] border-2 border-[#161816] rounded-2xl shadow-[8px_8px_0px_#161816] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="bg-[#FFE047] border-b-2 border-[#161816] px-5 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-base sm:text-lg font-extrabold text-[#161816] truncate">
              {media.title}
            </h3>
            {media.subtitle && (
              <p className="text-xs font-semibold text-[#161816]/80 truncate">{media.subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex rounded-lg border-2 border-[#161816] bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setMode('image')}
                className={`px-3 py-1.5 text-xs font-extrabold inline-flex items-center gap-1.5 ${
                  mode === 'image' ? 'bg-[#5EEAD4] text-[#161816]' : 'bg-white text-[#464B46]'
                }`}
              >
                <ImageIcon className="h-3.5 w-3.5" />
                Photo
              </button>
              <button
                type="button"
                onClick={() => setMode('video')}
                className={`px-3 py-1.5 text-xs font-extrabold border-l-2 border-[#161816] inline-flex items-center gap-1.5 ${
                  mode === 'video' ? 'bg-[#FCA5A5] text-[#161816]' : 'bg-white text-[#464B46]'
                }`}
              >
                <Film className="h-3.5 w-3.5" />
                Video
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close media viewer"
              className="nb-btn-sm h-9 w-9 bg-white flex items-center justify-center text-[#161816]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Interactive Image / Video Stage */}
        <div className="relative bg-[#161816] flex items-center justify-center aspect-[16/10] w-full overflow-hidden">
          {mode === 'image' ? (
            <>
              <button
                type="button"
                onClick={() => setZoomed((z) => !z)}
                className="w-full h-full flex items-center justify-center cursor-zoom-in focus:outline-none"
                title={zoomed ? 'Click to reset zoom' : 'Click image to zoom'}
              >
                <img
                  src={media.imageUrl}
                  alt={media.title}
                  referrerPolicy="no-referrer"
                  className={`max-h-full max-w-full object-contain transition-transform duration-200 ${
                    zoomed ? 'scale-125 cursor-zoom-out' : 'scale-100'
                  }`}
                />
              </button>
              <button
                type="button"
                onClick={() => setZoomed((z) => !z)}
                className="nb-btn-sm absolute bottom-3 right-3 bg-white px-2.5 py-1 text-[11px] font-extrabold text-[#161816] inline-flex items-center gap-1"
              >
                {zoomed ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                {zoomed ? 'Reset Zoom' : 'Zoom Photo'}
              </button>
            </>
          ) : (
            <video
              key={media.videoUrl}
              src={media.videoUrl}
              controls
              autoPlay
              loop
              playsInline
              className="w-full h-full object-contain bg-black"
            />
          )}
        </div>

        {/* Footer mascot strip */}
        {media.mascotLine && (
          <div className="px-5 py-3 bg-[#FEF08A] border-t-2 border-[#161816] flex items-center gap-2.5 text-xs">
            <span className="text-lg" aria-hidden="true">
              {media.mascotEmoji || '🌱'}
            </span>
            <p className="font-semibold text-[#161816]">&ldquo;{media.mascotLine}&rdquo;</p>
          </div>
        )}
      </div>
    </div>
  );
}
