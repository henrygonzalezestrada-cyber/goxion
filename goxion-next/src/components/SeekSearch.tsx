import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function SeekSearch({ value, onChange }: Props) {
  const [open, setOpen] = useState(Boolean(value));
  const [pressed, setPressed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (value) setOpen(true);
  }, [value]);

  const start = () => {
    if (open) {
      inputRef.current?.focus({ preventScroll: true });
      return;
    }

    setPressed(true);
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    window.setTimeout(() => setPressed(false), reduced ? 0 : 110);
  };

  const closeIfEmpty = () => {
    if (!value.trim()) setOpen(false);
  };

  return (
    <motion.div
      className="gx-next-seek"
      data-open={open}
      data-press={pressed}
      animate={{ width: open ? 'min(238px, 62vw)' : 42 }}
      transition={
        reduced
          ? { duration: 0 }
          : { type: 'spring', stiffness: 420, damping: 34, mass: 0.72 }
      }
    >
      <motion.div
        className="gx-next-seek-skin"
        animate={{ scale: pressed ? 0.94 : 1 }}
        transition={{ type: 'spring', stiffness: 520, damping: 27 }}
      >
        <svg className="gx-next-seek-lens" viewBox="0 0 18 18" aria-hidden="true">
          <circle cx="7.6" cy="7.6" r="5.4" />
          <path d="M11.6 11.6 L15.4 15.4" />
        </svg>

        <input
          ref={inputRef}
          value={value}
          className="gx-next-seek-field"
          type="search"
          inputMode="search"
          autoComplete="off"
          aria-label="Buscar plataforma o plan"
          placeholder="Buscar plataforma o plan"
          tabIndex={open ? 0 : -1}
          onChange={(event) => onChange(event.target.value)}
          onBlur={closeIfEmpty}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            onChange('');
            setOpen(false);
            inputRef.current?.blur();
          }}
        />

        {!open && (
          <button
            type="button"
            className="gx-next-seek-hit"
            aria-label="Buscar en el catálogo"
            onClick={start}
          />
        )}
      </motion.div>
    </motion.div>
  );
}
