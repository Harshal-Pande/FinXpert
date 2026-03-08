import { cn } from '@/lib/utils/cn';

interface DashboardCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function DashboardCard({ title, children, className }: DashboardCardProps) {
  return (
    <div className={cn('rounded-lg border bg-white p-4 shadow-sm', className)}>
      <h3 className="text-sm font-medium text-gray-700">{title}</h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}
