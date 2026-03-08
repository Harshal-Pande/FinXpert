interface ClientCardProps {
  name: string;
  occupation?: string;
  riskProfile?: string;
  onClick?: () => void;
}

export function ClientCard({ name, occupation, riskProfile, onClick }: ClientCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      className="cursor-pointer rounded-lg border bg-white p-4 shadow-sm transition hover:border-primary-500 hover:shadow"
    >
      <h4 className="font-medium text-gray-900">{name}</h4>
      {occupation && <p className="text-sm text-gray-600">{occupation}</p>}
      {riskProfile && (
        <span className="mt-2 inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
          {riskProfile}
        </span>
      )}
    </div>
  );
}
