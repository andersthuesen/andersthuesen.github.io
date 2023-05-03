export type ToggleOption = {
  key: string;
  label: string;
};

export type ToggleProps = {
  label?: string;
  selected: string | null;
  name: string;
  options: ToggleOption[];
};
export const Toggle: React.FC<ToggleProps> = ({
  label,
  selected,
  name,
  options,
}) => {
  return (
    <div className="toggle">
      {label && <label>{label}:</label>}
      <select name={name} defaultValue={selected ?? undefined}>
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};
