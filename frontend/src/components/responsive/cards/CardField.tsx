import clsx from 'clsx';

type CardFieldProps = {
  label: string;
  value: React.ReactNode;
};

const CardField = ({ label, value }: CardFieldProps) => (
  <div className="flex flex-col text-xs text-slate-500 dark:text-slate-300">
    <span className="font-semibold text-slate-800 dark:text-slate-100">{label}</span>
    <span className="text-sm text-slate-600 dark:text-slate-200">{value}</span>
  </div>
);

export default CardField;
