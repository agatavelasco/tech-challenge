'use client';

import { Check, ChevronDown } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { cn } from '@/lib/cn';

export interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

interface SelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  icon?: ReactNode;
  disabled?: boolean;
  invalid?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  ref?: Ref<HTMLButtonElement>;
  onBlur?: () => void;
  'aria-describedby'?: string | undefined;
}

export function Select({
  id,
  value,
  onChange,
  options,
  placeholder = 'Selecione',
  icon,
  disabled = false,
  invalid = false,
  size = 'md',
  className,
  ref,
  onBlur,
  'aria-describedby': describedBy,
}: SelectProps) {
  const generatedId = useId();
  const listId = `${id ?? generatedId}-listbox`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = options[selectedIndex];
  const optionId = (index: number) => `${listId}-option-${String(index)}`;

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
    };
  }, [open]);

  const openList = () => {
    if (disabled) return;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : firstEnabled());
    setOpen(true);
  };

  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    setOpen(false);
  };

  const firstEnabled = () => options.findIndex((option) => !option.disabled);

  const move = (direction: 1 | -1) => {
    for (let step = 1; step <= options.length; step++) {
      const candidate = (activeIndex + direction * step + options.length) % options.length;
      if (!options[candidate]?.disabled) {
        setActiveIndex(candidate);
        return;
      }
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        if (open) move(event.key === 'ArrowDown' ? 1 : -1);
        else openList();
        break;
      case 'Home':
      case 'End':
        if (!open) return;
        event.preventDefault();
        setActiveIndex(
          event.key === 'Home'
            ? firstEnabled()
            : options.findLastIndex((option) => !option.disabled),
        );
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (open) choose(activeIndex);
        else openList();
        break;
      case 'Escape':
        if (open) {
          event.preventDefault();
          setOpen(false);
        }
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  };

  const fieldIcon = selected?.icon ?? icon;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        ref={ref}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        disabled={disabled}
        onClick={() => {
          if (open) setOpen(false);
          else openList();
        }}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white pr-3 text-left text-slate-900 shadow-xs transition-colors hover:border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 aria-expanded:border-brand-500 aria-expanded:ring-4 aria-expanded:ring-brand-500/15 aria-invalid:border-red-400',
          size === 'md' ? 'h-10 pl-3 text-sm' : 'h-8 pl-2.5 text-sm font-medium',
        )}
      >
        {fieldIcon && (
          <span aria-hidden className="flex shrink-0 text-slate-400 [&_svg]:size-4">
            {fieldIcon}
          </span>
        )}
        <span className={cn('flex-1 truncate', !selected && 'text-slate-400')}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            'size-4 shrink-0 text-slate-400 transition-transform duration-200',
            open && 'rotate-180 text-brand-600',
          )}
        />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={id}
          tabIndex={-1}
          className="absolute top-full right-0 left-0 z-30 mt-1.5 max-h-64 min-w-max overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/10 motion-safe:animate-fade-up"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <li
                key={option.value}
                id={optionId(index)}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled}
                onMouseEnter={() => {
                  setActiveIndex(index);
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                onClick={() => {
                  choose(index);
                }}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-slate-700 select-none',
                  index === activeIndex && 'bg-slate-100 text-slate-900',
                  isSelected && 'font-semibold text-brand-700',
                  option.disabled && 'cursor-not-allowed opacity-50',
                )}
              >
                {option.icon && (
                  <span
                    aria-hidden
                    className={cn(
                      'flex shrink-0 [&_svg]:size-4',
                      isSelected ? 'text-brand-600' : 'text-slate-400',
                    )}
                  >
                    {option.icon}
                  </span>
                )}
                <span className="flex-1">{option.label}</span>
                {isSelected && <Check aria-hidden className="size-4 shrink-0 text-brand-600" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
