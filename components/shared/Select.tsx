'use client';
// components/shared/Select.tsx
// Modern, Accessible, Mobile-Friendly Custom Select & Combobox Component

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
  useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  badge?: string;
}

export interface SelectProps<T extends string = string> {
  value?: T;
  defaultValue?: T;
  onChange?: (value: T) => void;
  options: Array<SelectOption<T> | { value: T; label: string; [key: string]: any }>;
  placeholder?: string;
  label?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  clearable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filter' | 'ghost' | 'pill';
  align?: 'left' | 'right';
  className?: string;
  triggerClassName?: string;
  dropdownClassName?: string;
  id?: string;
  name?: string;
  ariaLabel?: string;
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
  placement: 'bottom' | 'top';
}

export function Select<T extends string = string>({
  value: controlledValue,
  defaultValue,
  onChange,
  options = [],
  placeholder = 'Pilih opsi...',
  label,
  error,
  helperText,
  disabled = false,
  required = false,
  searchable = false,
  searchPlaceholder = 'Cari opsi...',
  clearable = false,
  size = 'md',
  variant = 'default',
  align = 'left',
  className,
  triggerClassName,
  dropdownClassName,
  id,
  name,
  ariaLabel,
}: SelectProps<T>) {
  const generatedId = useId();
  const selectId = id || generatedId;

  // Uncontrolled vs Controlled state
  const [internalValue, setInternalValue] = useState<T>(defaultValue ?? ('' as T));
  const isControlled = controlledValue !== undefined;
  const selectedValue = isControlled ? controlledValue : internalValue;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<DropdownPosition | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Normalize options
  const normalizedOptions = useMemo<SelectOption<T>[]>(() => {
    return options.map((opt) => ({
      value: opt.value as T,
      label: opt.label,
      description: (opt as SelectOption<T>).description,
      icon: (opt as SelectOption<T>).icon,
      disabled: (opt as SelectOption<T>).disabled,
      badge: (opt as SelectOption<T>).badge,
    }));
  }, [options]);

  // Selected option item
  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => opt.value === selectedValue);
  }, [normalizedOptions, selectedValue]);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const query = searchQuery.toLowerCase().trim();
    return normalizedOptions.filter((opt) =>
      opt.label.toLowerCase().includes(query) ||
      (opt.description && opt.description.toLowerCase().includes(query)) ||
      (opt.badge && opt.badge.toLowerCase().includes(query))
    );
  }, [normalizedOptions, searchQuery]);

  // Calculate dynamic floating portal position
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const estimatedHeight = Math.min(filteredOptions.length * 40 + (searchable ? 52 : 16), 280);

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Prefer opening downwards, but flip upwards if space below is too tight and space above is larger
    const placement: 'bottom' | 'top' = (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) ? 'top' : 'bottom';

    const minWidth = Math.max(rect.width, 180);
    let left = rect.left;

    if (align === 'right') {
      left = rect.right - minWidth;
    }

    // Keep within horizontal viewport boundaries
    if (left + minWidth > viewportWidth - 12) {
      left = viewportWidth - minWidth - 12;
    }
    if (left < 12) {
      left = 12;
    }

    const top = placement === 'bottom' ? rect.bottom + 6 : rect.top - 6;

    setPosition({
      top,
      left,
      width: minWidth,
      placement,
    });
  }, [align, filteredOptions.length, searchable]);

  const handleOpen = () => {
    if (disabled) return;
    updatePosition();
    setIsOpen(true);
    setSearchQuery('');
    const idx = filteredOptions.findIndex((opt) => opt.value === selectedValue);
    setHighlightedIndex(idx >= 0 ? idx : 0);
  };

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
    setHighlightedIndex(-1);
    // return focus to trigger
    triggerRef.current?.focus();
  }, []);

  const handleToggle = () => {
    if (isOpen) {
      handleClose();
    } else {
      handleOpen();
    }
  };

  const handleSelect = useCallback(
    (option: SelectOption<T>) => {
      if (option.disabled) return;
      if (!isControlled) {
        setInternalValue(option.value);
      }
      onChange?.(option.value);
      handleClose();
    },
    [isControlled, onChange, handleClose]
  );

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (!isControlled) {
      setInternalValue('' as T);
    }
    onChange?.('' as T);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleOpen();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        setHighlightedIndex((prev) => {
          const next = prev + 1;
          return next < filteredOptions.length ? next : 0;
        });
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        setHighlightedIndex((prev) => {
          const next = prev - 1;
          return next >= 0 ? next : filteredOptions.length - 1;
        });
        break;
      }
      case 'Enter': {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      }
      case 'Escape': {
        e.preventDefault();
        handleClose();
        break;
      }
      case 'Tab': {
        handleClose();
        break;
      }
    }
  };

  // Sync position on scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    window.addEventListener('scroll', handleScrollOrResize, { passive: true, capture: true });

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
    };
  }, [isOpen, updatePosition]);

  // Focus search input when open
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  // Outside click listener
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        listboxRef.current &&
        !listboxRef.current.contains(target)
      ) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen, handleClose]);

  // Auto-scroll highlighted option into view
  useEffect(() => {
    if (!isOpen || highlightedIndex < 0 || !listboxRef.current) return;
    const itemEl = listboxRef.current.querySelector(`[data-index="${highlightedIndex}"]`) as HTMLElement;
    if (itemEl) {
      itemEl.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  // Styles per size
  const sizeStyles = {
    sm: 'h-9 px-3 text-xs gap-1.5 rounded-xl',
    md: 'h-10 px-3.5 text-xs sm:text-[13px] gap-2 rounded-xl',
    lg: 'h-11 px-4 text-sm gap-2.5 rounded-2xl',
  };

  // Styles per variant
  const variantStyles = {
    default: cn(
      'bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 text-slate-800',
      'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white',
      'shadow-2xs transition-all duration-150 active:scale-[0.99]'
    ),
    filter: cn(
      'bg-slate-50/90 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold',
      'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
      'shadow-2xs transition-all duration-150'
    ),
    ghost: cn(
      'bg-transparent hover:bg-slate-100/80 border border-transparent text-slate-700',
      'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-slate-200'
    ),
    pill: cn(
      'bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-800 font-semibold rounded-full',
      'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
      'shadow-2xs transition-all duration-150'
    ),
  };

  return (
    <div className={cn('relative w-full text-left', className)}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Hidden input for HTML form submission */}
      {name && <input type="hidden" name={name} value={selectedValue || ''} />}

      <button
        ref={triggerRef}
        id={selectId}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={ariaLabel ? undefined : selectId}
        aria-label={ariaLabel}
        className={cn(
          'w-full flex items-center justify-between font-semibold select-none cursor-pointer',
          sizeStyles[size],
          variantStyles[variant],
          error && 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500 text-rose-900 bg-rose-50/20',
          disabled && 'opacity-50 cursor-not-allowed bg-slate-100 hover:bg-slate-100 active:scale-100',
          isOpen && 'ring-2 ring-blue-500/20 border-blue-500 bg-white',
          triggerClassName
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedOption?.icon && (
            <selectedOption.icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          )}
          <span
            className={cn(
              'truncate font-semibold',
              !selectedOption && 'text-slate-400 font-normal',
              selectedOption && 'text-slate-900'
            )}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200/60 text-slate-600 shrink-0">
              {selectedOption.badge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1.5">
          {clearable && selectedValue && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="p-0.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={cn(
              'w-3.5 h-3.5 text-slate-400 transition-transform duration-200',
              isOpen && 'rotate-180 text-blue-600'
            )}
          />
        </div>
      </button>

      {/* Helper text or Error message */}
      {error ? (
        <p className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-rose-500 animate-in fade-in">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="mt-1 text-[11px] font-medium text-slate-400">{helperText}</p>
      ) : null}

      {/* Floating Dropdown via Portal to prevent modal/container clipping */}
      {mounted &&
        isOpen &&
        position &&
        createPortal(
          <div
            ref={listboxRef}
            role="listbox"
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            style={{
              position: 'fixed',
              top: position.placement === 'bottom' ? position.top : undefined,
              bottom: position.placement === 'top' ? window.innerHeight - position.top : undefined,
              left: position.left,
              width: position.width,
              zIndex: 9999,
            }}
            className={cn(
              'max-w-[calc(100vw-24px)] rounded-2xl bg-white/95 backdrop-blur-md',
              'border border-slate-200/90 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5',
              'p-1.5 focus:outline-none animate-in fade-in zoom-in-95 duration-150',
              position.placement === 'bottom' ? 'slide-in-from-top-2' : 'slide-in-from-bottom-2',
              dropdownClassName
            )}
          >
            {/* Search Input for searchable Combobox */}
            {searchable && (
              <div className="relative p-1 mb-1 border-b border-slate-100">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={searchPlaceholder}
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-xl border border-slate-200/70 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Options List */}
            <div className="max-h-60 overflow-y-auto space-y-0.5 no-scrollbar py-0.5">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt, idx) => {
                  const isSelected = opt.value === selectedValue;
                  const isHighlighted = idx === highlightedIndex;
                  const Icon = opt.icon;

                  return (
                    <div
                      key={opt.value || `opt-${idx}`}
                      data-index={idx}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={opt.disabled}
                      onClick={() => handleSelect(opt)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-xl text-left cursor-pointer transition-all duration-100 select-none text-xs font-semibold',
                        isSelected
                          ? 'bg-blue-50/90 text-blue-700 font-bold'
                          : isHighlighted
                          ? 'bg-slate-100/90 text-slate-900'
                          : 'text-slate-700 hover:bg-slate-50',
                        opt.disabled && 'opacity-40 cursor-not-allowed bg-transparent hover:bg-transparent'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        {Icon && (
                          <Icon
                            className={cn(
                              'w-3.5 h-3.5 shrink-0',
                              isSelected ? 'text-blue-600' : 'text-slate-400'
                            )}
                          />
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{opt.label}</p>
                          {opt.description && (
                            <p className="text-[10px] text-slate-400 font-medium truncate">
                              {opt.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {opt.badge && (
                          <span
                            className={cn(
                              'text-[10px] font-bold px-1.5 py-0.5 rounded-md',
                              isSelected
                                ? 'bg-blue-200/50 text-blue-700'
                                : 'bg-slate-100 text-slate-500'
                            )}
                          >
                            {opt.badge}
                          </span>
                        )}
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 stroke-[2.5]" />
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-3 py-4 text-center text-xs text-slate-400 font-medium">
                  Tidak ada opsi yang sesuai
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
