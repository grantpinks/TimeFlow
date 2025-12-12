import React from 'react';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ required = false, optional = false, className = '', children, ...props }, ref) => {
    const baseStyles = 'block text-sm font-medium text-slate-700 mb-1';

    return (
      <label ref={ref} className={`${baseStyles} ${className}`} {...props}>
        {children}
        {required && <span className="text-red-500 ml-1">*</span>}
        {optional && <span className="text-slate-500 ml-1 font-normal">(optional)</span>}
      </label>
    );
  }
);

Label.displayName = 'Label';
