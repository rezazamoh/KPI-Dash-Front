import FilterSelectorButton from './FilterSelectorButton';

interface RepositorySelectorProps {
  repositories: string[];
  value: string[];
  onChange: (value: string[]) => void;
}

const RepositorySelector: React.FC<RepositorySelectorProps> = ({ repositories, value, onChange }) => (
  <FilterSelectorButton
    label="Repositories"
    options={repositories}
    value={value}
    onChange={onChange}
  />
);

export default RepositorySelector;