'use client';

import * as React from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import { X, Check, ChevronsUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Command, CommandGroup, CommandItem, CommandInput, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

type Option = {
  label: string;
  value: string;
};

interface MultiSelectProps {
  options: Option[];
  selected: string[] | undefined;
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Select items...',
  className,
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');

  // Create a map of selected values for O(1) lookup
  const selectedMap = React.useMemo(() => {
    return (selected || []).reduce((acc, value) => {
      acc[value] = true;
      return acc;
    }, {} as Record<string, boolean>);
  }, [selected]);

  // Find the selected options to display the labels
  const selectedOptions = React.useMemo(() => {
    return options.filter(option => selectedMap[option.value]);
  }, [options, selectedMap]);

  const handleSelect = React.useCallback(
    (value: string) => {
      setInputValue('');
      
      if (selectedMap[value]) {
        // If already selected, remove it
        onChange((selected || []).filter(item => item !== value));
      } else {
        // Otherwise add it
        onChange([...(selected || []), value]);
      }
    },
    [onChange, selected, selectedMap]
  );

  const handleRemove = React.useCallback(
    (value: string) => {
      onChange((selected || []).filter(item => item !== value));
    },
    [onChange, selected]
  );

  // Filter options based on input value
  const filteredOptions = React.useMemo(() => {
    return options.filter(option => 
      option.label.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [options, inputValue]);

  return (
    <div className={cn("relative w-full", className)}>
      <div
        className={cn(
          "relative flex min-h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => !disabled && setOpen(true)}
      >
        <div className="flex flex-wrap gap-1">
          {selectedOptions.map(option => (
            <Badge key={option.value} variant="secondary" className="m-0.5">
              {option.label}
              <button
                className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onKeyDown={e => e.stopPropagation()}
                onMouseDown={e => e.preventDefault()}
                onClick={e => {
                  e.stopPropagation();
                  if (!disabled) handleRemove(option.value);
                }}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove {option.label}</span>
              </button>
            </Badge>
          ))}

          <input
            type="text"
            placeholder={selectedOptions.length === 0 ? placeholder : ""}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !inputValue && selected && selected.length > 0) {
                // Remove the last selected item when pressing backspace in an empty input
                handleRemove(selected[selected.length - 1]);
              }
              // Close the dropdown on escape
              if (e.key === 'Escape') {
                setOpen(false);
              }
            }}
            disabled={disabled}
            className="ml-1 flex-1 outline-none placeholder:text-muted-foreground bg-transparent"
          />
        </div>
        <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
      </div>
      
      {open && !disabled && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-input bg-popover shadow-md outline-none animate-in">
          <Command className="w-full">
            <CommandGroup className="max-h-60 overflow-auto">
              {filteredOptions.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No results found.
                </p>
              )}
              
              {filteredOptions.map(option => (
                <CommandItem
                  key={option.value}
                  onSelect={() => handleSelect(option.value)}
                  className="flex items-center justify-between"
                >
                  <span>{option.label}</span>
                  {selectedMap[option.value] && (
                    <Check className="h-4 w-4" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </div>
      )}
    </div>
  );
}
