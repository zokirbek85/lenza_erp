import type { ReactNode } from 'react';

type MobileFormFieldProps = {
  label: string;
  children: ReactNode;
  required?: boolean;
  error?: string;
  hint?: string;
};

/**
 * MobileFormField - Touch-optimized form field wrapper
 * 
 * Features:
 * - Large touch target (min 44px)
 * - Clear labels with proper contrast
 * - Error state display
 * - Optional hint text
 * - Consistent spacing
 */
const MobileFormField = ({
  label,
  children,
  required,
  error,
  hint,
}: MobileFormFieldProps) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </label>
      {hint && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      )}
      <div className="mobile-form-field-input">
        {children}
      </div>
      {error && (
        <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
};

export default MobileFormField;
