import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';

interface SmoothDropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
}

export function SmoothDropdown({ trigger, children, className, align = 'end' }: SmoothDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const alignmentClass = {
    start: 'left-0',
    center: 'left-1/2 transform -translate-x-1/2',
    end: 'right-0'
  }[align];

  return (
    <div className="dropdown-container" ref={dropdownRef}>
      <div
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer"
      >
        {trigger}
      </div>
      
      {isOpen && (
        <div
          className={cn(
            'absolute top-full mt-2 z-50 min-w-[200px] bg-white rounded-lg shadow-lg border border-gray-200 py-1',
            'animate-dropdown-in',
            alignmentClass,
            className
          )}
          style={{
            transformOrigin: align === 'end' ? 'top right' : align === 'start' ? 'top left' : 'top center'
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface DropdownItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'danger';
}

export function DropdownItem({ children, onClick, className, variant = 'default' }: DropdownItemProps) {
  const variantClasses = {
    default: 'hover:bg-gray-50 text-gray-700',
    danger: 'hover:bg-red-50 text-red-600'
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'px-4 py-2 text-sm cursor-pointer dropdown-item-hover',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </div>
  );
}
