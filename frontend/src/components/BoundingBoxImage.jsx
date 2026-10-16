import { useState } from 'react';
import { Download, ImageOff } from 'lucide-react';

/** Shows an image (e.g. the annotated result with boxes drawn by the backend) with loading/error states. */
export default function BoundingBoxImage({ src, alt, label, downloadHref }) {
  const [state, setState] = useState('loading');
  return (
    <figure className="overflow-hidden rounded-xl border border-navy-600/60 bg-navy-900">
      <figcaption className="flex items-center justify-between gap-2 border-b border-navy-600/60 px-3 py-2 text-xs font-medium text-slate-300">
        <span>{label}</span>
        {downloadHref && (
          <a href={downloadHref} download className="btn-secondary !px-2.5 !py-1 !text-xs">
            <Download className="h-3.5 w-3.5" /> Download
          </a>
        )}
      </figcaption>
      <div className="relative flex min-h-[10rem] items-center justify-center bg-black/30">
        {state === 'loading' && <div className="absolute inset-0 animate-pulse bg-navy-700/40" />}
        {state === 'error' ? (
          <div className="flex flex-col items-center gap-2 p-6 text-slate-500">
            <ImageOff className="h-8 w-8" />
            <span className="text-xs">Image unavailable (it may have been deleted)</span>
          </div>
        ) : (
          <img
            src={src}
            alt={alt}
            onLoad={() => setState('ready')}
            onError={() => setState('error')}
            className="relative max-h-[28rem] w-full object-contain"
          />
        )}
      </div>
    </figure>
  );
}
