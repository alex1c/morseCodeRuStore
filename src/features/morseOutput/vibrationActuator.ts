/**
 * Injectable vibration actuator — keeps coordinator unit-testable.
 */

import { Vibration } from 'react-native'

export type VibrationActuator = {
	vibrate: (pattern: number[]) => void
	cancel: () => void
}

let actuator: VibrationActuator | null = null

export function setVibrationActuatorForTests (
	next: VibrationActuator | null,
): void {
	actuator = next
}

export function getVibrationActuator (): VibrationActuator {
	if (actuator) {
		return actuator
	}
	return Vibration
}
