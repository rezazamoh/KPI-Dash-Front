import FilterSelectorButton from './FilterSelectorButton';

interface TopicSelectorProps {
  topics: string[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const TopicSelector: React.FC<TopicSelectorProps> = ({ topics, value, onChange, disabled = false, onOpenChange }) => (
  <FilterSelectorButton
    label="Topics"
    options={topics}
    value={value}
    onChange={onChange}
    disabled={disabled}
    onOpenChange={onOpenChange}
  />
);

export default TopicSelector;