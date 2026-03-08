interface PortfolioSummaryProps {
  totalValue: number;
  allocation?: Record<string, number>;
}

export function PortfolioSummary({ totalValue, allocation = {} }: PortfolioSummaryProps) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <h4 className="text-sm font-medium text-gray-700">Portfolio Value</h4>
      <p className="mt-1 text-2xl font-semibold text-gray-900">
        ₹{totalValue.toLocaleString()}
      </p>
      {Object.keys(allocation).length > 0 && (
        <div className="mt-3 text-sm text-gray-600">
          Allocation: {Object.entries(allocation).map(([k, v]) => `${k}: ${(v * 100).toFixed(0)}%`).join(', ')}
        </div>
      )}
    </div>
  );
}
