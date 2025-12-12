import React, { useEffect, useRef } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  success?: boolean;
  helperText?: string;
  label?: string;
  labelRequired?: boolean;
  autoResize?: boolean;
  showCharCount?: boolean;
  maxCharCount?: number;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      error = false,
      success = false,
      helperText,
      label,
      labelRequired = false,
      autoResize = false,
      showCharCount = false,
      maxCharCount,
      className = '',
      disabled,
      id,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;

    const baseStyles =
      'w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed resize-y';

    const stateStyles = error
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
      : success
      ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
      : 'border-slate-300 focus:border-transparent focus:ring-primary-500';

    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    const charCount = typeof value === 'string' ? value.length : 0;

    useEffect(() => {
      if (autoResize && textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }, [value, autoResize, textareaRef]);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            {label}
            {labelRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={textareaRef}
          id={textareaId}
          className={`${baseStyles} ${stateStyles} ${autoResize ? 'resize-none' : ''} ${className}`}
          disabled={disabled}
          value={value}
          onChange={onChange}
          maxLength={maxCharCount}
          {...props}
        />
        <div className="flex justify-between items-center mt-1">
          {helperText && (
            <p
              className={`text-sm ${
                error ? 'text-red-600' : success ? 'text-green-600' : 'text-slate-500'
              }`}
            >
              {helperText}
            </p>
          )}
          {showCharCount && maxCharCount && (
            <p className="text-sm text-slate-500 ml-auto">
              {charCount}/{maxCharCount}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
