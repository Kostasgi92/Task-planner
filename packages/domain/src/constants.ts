export const importanceValues = ['low', 'medium', 'high'] as const;
export type Importance = (typeof importanceValues)[number];

/** Palette offered when creating or editing a category. */
export const CATEGORY_COLORS = ['#e5b94f', '#d17e62', '#6e9b89', '#7895b2', '#9b82ab', '#c38d56'] as const;

/** Color used when a category is created without one. */
export const FALLBACK_CATEGORY_COLOR = '#5E61E8';

/** Created automatically the first time a user opens the app. */
export const DEFAULT_CATEGORY = { name: 'Personal', color: '#e5b94f' } as const;

/** How many of today's tasks the widget summary returns. */
export const WIDGET_TASK_LIMIT = 5;
