import { motion } from 'motion/react';

type Option = {
  id: string;
  label: string;
};

type Props = {
  options: Option[];
  value: string;
  onChange: (id: string) => void;
};

export function SegmentedHighlight({ options, value, onChange }: Props) {
  return (
    <div className="gx-segments" role="tablist" aria-label="Filtros del catálogo">
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            className="gx-segment"
            onClick={() => onChange(option.id)}
          >
            {active && (
              <motion.span
                layoutId="gx-filter-highlight"
                className="gx-segment-highlight"
                transition={{ type: 'spring', stiffness: 430, damping: 34, mass: 0.7 }}
              />
            )}
            <span className="gx-segment-label">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
