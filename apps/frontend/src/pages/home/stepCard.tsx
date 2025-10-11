import type { StepCardProps } from "./types";

const StepCard: React.FC<StepCardProps> = ({
  number,
  title,
  description,
  styles,
}) => {
  return (
    <li
      className={`flex gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 ${styles.container}`}
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${styles.badge}`}
      >
        {number}
      </span>
      <div>
        <p className="font-semibold text-slate-100">{title}</p>
        <p className="text-slate-300">{description}</p>
      </div>
    </li>
  );
};
export default StepCard;
