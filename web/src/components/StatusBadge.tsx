const STYLES: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  Confirmed: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  Shipped: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200",
  Delivered: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  Cancelled: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        STYLES[status] ?? "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
      }`}
    >
      {status}
    </span>
  );
}
