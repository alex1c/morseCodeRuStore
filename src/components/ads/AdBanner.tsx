/**
 * Reusable calm-screen banner — collapses on load failure (no empty hole).
 */

import { useCallback, useEffect, useState } from 'react'
import { Platform, StyleSheet, View } from 'react-native'

import type { BannerPlacement } from '@/src/config/ads'
import { getBannerAdUnitId } from '@/src/config/ads'
import { spacing } from '@/src/theme'
import { getYandexAdsModule } from '@/src/features/ads/yandexAdsAdapter'

type AdBannerProps = {
	placement: BannerPlacement
}

/**
 * Bottom banner for calm screens only.
 * Never place on active Lesson / ReceiveSession / TransmitSession / Daily.
 */
export function AdBanner ({ placement: _placement }: AdBannerProps) {
	const [visible, setVisible] = useState(true)
	const [bannerSize, setBannerSize] = useState<unknown>(null)
	const adUnitId = getBannerAdUnitId()
	const yandex = getYandexAdsModule()

	const handleFailed = useCallback(() => {
		setVisible(false)
	}, [])

	useEffect(() => {
		if (!adUnitId || !yandex || Platform.OS === 'web') {
			return
		}
		let cancelled = false
		void yandex.BannerAdSize.stickySize(320)
			.then((size) => {
				if (!cancelled) {
					setBannerSize(size)
				}
			})
			.catch(() => {
				if (!cancelled) {
					setVisible(false)
				}
			})
		return () => {
			cancelled = true
		}
	}, [adUnitId, yandex])

	if (
		!adUnitId ||
		!visible ||
		!yandex ||
		Platform.OS === 'web' ||
		!bannerSize
	) {
		return null
	}

	const { BannerView } = yandex

	return (
		<View
			style={styles.container}
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
		>
			<BannerView
				size={bannerSize as never}
				adRequest={{ adUnitId }}
				onAdFailedToLoad={handleFailed}
				style={styles.banner}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		marginTop: spacing.lg,
		marginBottom: spacing.md,
	},
	banner: {
		width: 320,
		height: 50,
	},
})
