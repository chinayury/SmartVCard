import { Icon, type IconName } from "./Icon";

export interface SegmentedOption<T extends string | number> {
 value: T;
 label: string;
 icon?: IconName;
}

interface SegmentedProps<T extends string | number> {
 value: T;
 options: readonly SegmentedOption<T>[];
 onChange: (value: T) => void;
 ariaLabel: string;
}

/** Radio-like group built from buttons, usable with roving focus and arrows. */
export function Segmented<T extends string | number>({
 value,
 options,
 onChange,
 ariaLabel,
}: SegmentedProps<T>) {
 return (
 <div className="seg" role="group" aria-label={ariaLabel}>
 {options.map((option) => (
 <button
 key={String(option.value)}
 type="button"
 aria-pressed={value === option.value}
 onClick={() => onChange(option.value)}
 className="seg__item inline-flex items-center justify-center gap-1.5"
 >
 {option.icon && <Icon name={option.icon} className="h-3.5 w-3.5" />}
 {option.label}
 </button>
 ))}
 </div>
 );
}
