/**
 * Hidden CameraView host that registers a TorchDriver with the output layer.
 * Mount once near app root — no visible camera preview.
 */

import { useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'

import {
	registerTorchDriver,
	type TorchDriver,
	type TorchPermissionStatus,
} from './torchDriver'

function mapPermission (
	granted: boolean | undefined,
	canAskAgain: boolean | undefined,
): TorchPermissionStatus {
	if (granted) {
		return 'granted'
	}
	if (canAskAgain === false) {
		return 'blocked'
	}
	if (granted === false) {
		return 'denied'
	}
	return 'unknown'
}

/**
 * Keep a 1×1 off-screen camera so torch can be toggled without preview UX.
 */
export function TorchHost () {
	const [permission, requestPermission] = useCameraPermissions()
	const [sessionActive, setSessionActive] = useState(false)
	const [torchOn, setTorchOn] = useState(false)
	const [cameraReady, setCameraReady] = useState(false)
	const readyWaiters = useRef<(() => void)[]>([])

	useEffect(() => {
		const driver: TorchDriver = {
			async getPermissionStatus () {
				return mapPermission(
					permission?.granted,
					permission?.canAskAgain,
				)
			},
			async prepare () {
				let status = mapPermission(
					permission?.granted,
					permission?.canAskAgain,
				)
				if (status !== 'granted') {
					const result = await requestPermission()
					status = mapPermission(
						result.granted,
						result.canAskAgain,
					)
					if (status !== 'granted') {
						return {
							ok: false as const,
							status,
							error:
								status === 'blocked'
									? 'Доступ к камере запрещён. Разрешите его в настройках системы, чтобы использовать фонарик.'
									: 'Нужен доступ к камере для фонарика Морзе.',
						}
					}
				}
				setSessionActive(true)
				setCameraReady(false)
				await new Promise<void>((resolve) => {
					readyWaiters.current.push(resolve)
					// Safety timeout if onCameraReady never fires (emulator).
					setTimeout(resolve, 2500)
				})
				return { ok: true as const }
			},
			async setTorch (on: boolean) {
				setTorchOn(on)
			},
			async release () {
				setTorchOn(false)
				setSessionActive(false)
				setCameraReady(false)
			},
		}
		registerTorchDriver(driver)
		return () => {
			registerTorchDriver(null)
			setTorchOn(false)
			setSessionActive(false)
		}
	}, [permission, requestPermission])

	if (!sessionActive) {
		return null
	}

	return (
		<View style={styles.host} pointerEvents="none">
			<CameraView
				facing="back"
				enableTorch={torchOn && cameraReady}
				style={styles.camera}
				onCameraReady={() => {
					setCameraReady(true)
					const waiters = readyWaiters.current.splice(0)
					waiters.forEach((resolve) => resolve())
				}}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	host: {
		position: 'absolute',
		width: 1,
		height: 1,
		opacity: 0,
		overflow: 'hidden',
	},
	camera: {
		width: 1,
		height: 1,
	},
})
