export type MnemonicDot = {
	type: 'dot'
	x: number
	y: number
}

export type MnemonicDash = {
	type: 'dash'
	x: number
	y: number
	width: number
}

export type MnemonicElement = MnemonicDot | MnemonicDash

export type VisualMnemonic = {
	id: string
	symbolId: string
	width: number
	height: number
	guidePath: string
	elements: MnemonicElement[]
	labelX: number
	labelY: number
}
