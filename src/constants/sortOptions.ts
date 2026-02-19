export const SORT_OPTIONS = {
  DATE_CREATED: "dateCreated",
  PRIORITY: "priority",
  DATE_COMPLETED: "dateCompleted",
  COMPLETED_FIRST: "completedFirst",
  COMPLETED_LAST: "completedLast",
  DUE_DATE: "dueDate",
  CUSTOM: "custom",
} as const;

export type SortOption = (typeof SORT_OPTIONS)[keyof typeof SORT_OPTIONS];

export type SortDirection = "asc" | "desc";

export interface SortOptionMeta {
  value: SortOption | "global";
  label: string;
  description: string;
  supportsDirection: boolean;
}

export const SORT_OPTION_META: SortOptionMeta[] = [
  {
    value: "global",
    label: "Use Global Default",
    description: "Follow the default sort setting from Settings page",
    supportsDirection: false,
  },
  {
    value: SORT_OPTIONS.DATE_CREATED,
    label: "Date Created",
    description: "Sort by creation date",
    supportsDirection: true,
  },
  {
    value: SORT_OPTIONS.PRIORITY,
    label: "Priority",
    description: "Sort by priority level",
    supportsDirection: true,
  },
  {
    value: SORT_OPTIONS.DATE_COMPLETED,
    label: "Date Completed",
    description: "Show completed items first, sorted by completion date",
    supportsDirection: true,
  },
  {
    value: SORT_OPTIONS.COMPLETED_FIRST,
    label: "Completed First",
    description: "Show completed items at the top",
    supportsDirection: false,
  },
  {
    value: SORT_OPTIONS.COMPLETED_LAST,
    label: "Completed Last",
    description: "Show completed items at the bottom",
    supportsDirection: false,
  },
  {
    value: SORT_OPTIONS.DUE_DATE,
    label: "Due Date",
    description: "Sort by due date, then by creation date",
    supportsDirection: true,
  },
  {
    value: SORT_OPTIONS.CUSTOM,
    label: "Custom Sort (Drag & Drop)",
    description: "Enable drag & drop reordering within lists",
    supportsDirection: false,
  },
];

/**
 * Encodes a sort option and direction into a storable string.
 * Non-directional sorts are stored as plain values.
 */
export function encodeSortPreference(
  sort: SortOption,
  direction: SortDirection
): string {
  const meta = SORT_OPTION_META.find((m) => m.value === sort);
  if (!meta?.supportsDirection) return sort;
  return `${sort}:${direction}`;
}

/**
 * Parses a stored sort preference string into sort + direction.
 * Plain values (no ":") default to "desc".
 */
export function parseSortPreference(stored: string): {
  sort: SortOption;
  direction: SortDirection;
} {
  const colonIdx = stored.indexOf(":");
  if (colonIdx === -1) {
    return { sort: stored as SortOption, direction: "desc" };
  }
  const sort = stored.slice(0, colonIdx) as SortOption;
  const direction = stored.slice(colonIdx + 1) as SortDirection;
  return { sort, direction };
}
