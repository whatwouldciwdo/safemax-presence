import React from 'react';

interface NeuInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const NeuInput: React.FC<NeuInputProps> = ({
  label,
  error,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 ml-1"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-4 py-2.5 neu-input text-slate-800 placeholder-slate-400 text-sm transition-all ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-rose-500 mt-1 ml-1">{error}</p>}
    </div>
  );
};
