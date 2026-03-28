interface StatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { label: string; classes: string }> = {
  active: { label: 'Active', classes: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  inactive: { label: 'Inactive', classes: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200' },
  draft: { label: 'Draft', classes: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200' },
  pending: { label: 'Pending', classes: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  approved: { label: 'Approved', classes: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  rejected: { label: 'Rejected', classes: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  paused: { label: 'Paused', classes: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
  completed: { label: 'Completed', classes: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  failed: { label: 'Failed', classes: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  skipped: { label: 'Skipped', classes: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200' },
  header: { label: 'Header', classes: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200' },
  child: { label: 'Child', classes: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    classes: 'bg-gray-100 text-gray-600',
  };

  return (
    <span className={`badge ${config.classes}`}>
      {config.label}
    </span>
  );
}
