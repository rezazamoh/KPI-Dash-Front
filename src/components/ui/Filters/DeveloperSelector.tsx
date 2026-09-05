import FilterSelectorButton from './FilterSelectorButton';

interface DeveloperSelectorProps {
  developers: string[];
  value: string | string[] | null;
  onChange: (value: string | string[] | null) => void;
  multiple?: boolean;
}

const DeveloperSelector: React.FC<DeveloperSelectorProps> = ({
  developers,
  value,
  onChange,
  multiple = false,
}) => {
  const values = Array.isArray(value)
    ? value
    : value
      ? [value]
      : [];

  const handleChange = (nextValue: string[]) => {
    if (multiple) {
      onChange(nextValue);
    } else {
      onChange(nextValue[0] ?? null);
    }
  };

  return (
    <FilterSelectorButton
      label={multiple ? 'Developers' : 'Developer'}
      options={developers}
      value={values}
      onChange={handleChange}
      multiple={multiple}
    />
  );
};

export default DeveloperSelector;