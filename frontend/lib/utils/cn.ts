/**
 * Simple class name utility for conditional Tailwind classes.
 * Replace with clsx/classnames if needed.
 */
export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
