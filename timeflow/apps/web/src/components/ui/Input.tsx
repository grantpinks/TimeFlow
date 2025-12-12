import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  success?: boolean;
  helperText?: string;
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
  label?: string;
  labelRequired?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      error = false,
      success = false,
      helperText,
      prefixIcon,
      suffixIcon,
      label,
      labelRequired = false,
      className = '',
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const stateStyles = error
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
      : success
      ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
      : 'border-slate-300 focus:border-transparent focus:ring-primary-500';

    const prefixPadding = prefixIcon ? 'pl-10' : '';
    const suffixPadding = suffixIcon ? 'pr-10' : '';

    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            {label}
            {labelRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {prefixIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {prefixIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`${baseStyles} ${stateStyles} ${prefixPadding} ${suffixPadding} ${className}`}
            disabled={disabled}
            {...props}
          />
          {suffixIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              {suffixIcon}
            </div>
          )}
        </div>
        {helperText && (
          <p
            className={`mt-1 text-sm ${
              error ? 'text-red-600' : success ? 'text-green-600' : 'text-slate-500'
            }`}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
