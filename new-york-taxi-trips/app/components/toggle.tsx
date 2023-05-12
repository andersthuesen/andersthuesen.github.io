export type ToggleOption<T extends string> = {
  key: T;
  label: string;
};

export type ToggleProps<T extends string> = {
  label?: string;
  value?: string;
  onValueChange?: (value: T) => void;
  name: string;
  options: ToggleOption<T>[];
};
export function Toggle<T extends string>({
  label,
  value,
  onValueChange,
  options,
}: ToggleProps<T>) {
  return (
    <div className="toggle">
      {label && <label>{label}:</label>}
      <select
        value={value}
        onChange={(e) => {
          onValueChange?.(e.target.value as T);
        }}
      >
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
