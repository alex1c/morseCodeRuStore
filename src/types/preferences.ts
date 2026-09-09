/**
 * User preference contracts persisted locally (Phase 1 foundation).
 */

/** Which Morse alphabet the learner wants to study. */
export type SelectedAlphabet = 'RU' | 'LATIN' | 'BOTH'

/** Theme preference stored in settings (system follows OS). */
export type ThemePreference = 'light' | 'dark' | 'system'

export type UserPreferences = {
	/** First-run onboarding completed when alphabet was chosen. */
	onboardingCompleted: boolean
	selectedAlphabet: SelectedAlphabet
	/** Sidetone frequency in Hz for future Morse audio engine. */
	toneFrequencyHz: number
	/** Target words-per-minute for character timing. */
	targetWpm: number
	/**
	 * Farnsworth / extra spacing multiplier (>1 slows inter-element gaps).
	 * Kept for Phase 2+ audio timing without changing the model.
	 */
	farnsworthMultiplier: number
	soundEnabled: boolean
	vibrationEnabled: boolean
	themePreference: ThemePreference
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
	onboardingCompleted: false,
	selectedAlphabet: 'RU',
	toneFrequencyHz: 600,
	targetWpm: 15,
	farnsworthMultiplier: 1.5,
	soundEnabled: true,
	vibrationEnabled: true,
	themePreference: 'system',
}
