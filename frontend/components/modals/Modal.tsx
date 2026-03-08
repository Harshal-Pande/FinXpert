'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        className={cn(
          'relative z-10 max-h-[90vh] w-full max-w-lg overflow-auto rounded-lg bg-white p-6 shadow-xl',
          className
        )}
      >
        {title && (
          <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>
        )}
        {children}
      </div>
    </div>
  );
}
