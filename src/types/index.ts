/**
 * Shared app-level type re-exports for convenient imports.
 */

export type {
	SelectedAlphabet,
	ThemePreference,
	UserPreferences,
} from './preferences'
export {
	DEFAULT_USER_PREFERENCES,
} from './preferences'

export type {
	LearningProgress,
	LocalDateString,
	SymbolStats,
	SymbolStatsMap,
} from './progress'
export {
	DEFAULT_LEARNING_PROGRESS,
	createEmptySymbolStats,
} from './progress'

export type { ToolSettings } from './tools'
export { DEFAULT_TOOL_SETTINGS } from './tools'
