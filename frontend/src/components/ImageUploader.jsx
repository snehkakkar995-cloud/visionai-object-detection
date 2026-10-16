import { useId, useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';

/** Drag-and-drop + click-to-browse file picker. `accept` is a list of extensions like ['jpg','png']. */
export default function ImageUploader({ accept, acceptLabel, onFile, disabled, hint, icon: Icon = UploadCloud }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);
  const id = useId();
  const acceptAttr = accept.map((e) => `.${e}`).join(',');

  const pick = (files) => {
    const f = files?.[0];
    if (f) onFile(f);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (!disabled) pick(e.dataTransfer.files);
      }}
      className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-10 text-center transition-colors ${
        drag ? 'border-brand-400 bg-brand-500/10' : 'border-navy-600 bg-navy-900/50 hover:border-brand-500/60'
      } ${disabled ? 'opacity-60' : ''}`}
    >
      <span className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/15 text-brand-400">
        <Icon className="h-7 w-7" />
      </span>
      <p className="text-sm font-medium text-white">Drag &amp; drop your file here</p>
      <p className="muted mt-1">or</p>
      <label htmlFor={id} className={`btn-secondary mt-2 ${disabled ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}>
        Browse files
      </label>
      <input
        id={id}
        ref={inputRef}
        type="file"
        accept={acceptAttr}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => pick(e.target.files)}
      />
      <p className="mt-3 text-xs text-slate-500">{acceptLabel}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
