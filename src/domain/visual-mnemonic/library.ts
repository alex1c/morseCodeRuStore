import { getSymbolById } from '@/src/domain/morse'
import type { VisualMnemonic } from './types'

const RAW_MNEMONICS: VisualMnemonic[] = [
	{
		id: 'ru-a-card',
		symbolId: 'ru-a',
		width: 220,
		height: 140,
		guidePath: 'M20 120 L110 20 L200 120',
		elements: [
			{ type: 'dot', x: 56, y: 88 },
			{ type: 'dash', x: 118, y: 88, width: 64 },
		],
		labelX: 110,
		labelY: 132,
	},
	{
		id: 'ru-t-card',
		symbolId: 'ru-t',
		width: 220,
		height: 140,
		guidePath: 'M110 22 L110 110 M58 22 L162 22',
		elements: [{ type: 'dash', x: 78, y: 88, width: 84 }],
		labelX: 110,
		labelY: 132,
	},
	{
		id: 'ru-n-card',
		symbolId: 'ru-n',
		width: 220,
		height: 140,
		guidePath: 'M36 120 L36 20 L186 120 L186 20',
		elements: [
			{ type: 'dash', x: 64, y: 90, width: 62 },
			{ type: 'dot', x: 152, y: 90 },
		],
		labelX: 110,
		labelY: 132,
	},
	{
		id: 'ru-o-card',
		symbolId: 'ru-o',
		width: 220,
		height: 140,
		guidePath: 'M58 70 A52 42 0 1 1 162 70 A52 42 0 1 1 58 70',
		elements: [
			{ type: 'dash', x: 58, y: 92, width: 38 },
			{ type: 'dash', x: 102, y: 92, width: 38 },
			{ type: 'dash', x: 146, y: 92, width: 38 },
		],
		labelX: 110,
		labelY: 132,
	},
	{
		id: 'ru-i-card',
		symbolId: 'ru-i',
		width: 220,
		height: 140,
		guidePath: 'M60 24 L60 118 M160 24 L160 118 M60 70 L160 70',
		elements: [
			{ type: 'dot', x: 90, y: 92 },
			{ type: 'dot', x: 132, y: 92 },
		],
		labelX: 110,
		labelY: 132,
	},
	{
		id: 'ru-s-card',
		symbolId: 'ru-s',
		width: 220,
		height: 140,
		guidePath: 'M170 32 C132 6, 52 20, 54 62 C56 90, 102 94, 146 104 C182 112, 176 132, 56 118',
		elements: [
			{ type: 'dot', x: 74, y: 92 },
			{ type: 'dot', x: 110, y: 92 },
			{ type: 'dot', x: 146, y: 92 },
		],
		labelX: 110,
		labelY: 132,
	},
	{
		id: 'latin-e-card',
		symbolId: 'latin-e',
		width: 220,
		height: 140,
		guidePath: 'M160 24 L62 24 L62 118 L162 118 M62 70 L142 70',
		elements: [{ type: 'dot', x: 110, y: 92 }],
		labelX: 110,
		labelY: 132,
	},
	{
		id: 'latin-t-card',
		symbolId: 'latin-t',
		width: 220,
		height: 140,
		guidePath: 'M110 22 L110 118 M52 22 L168 22',
		elements: [{ type: 'dash', x: 78, y: 92, width: 84 }],
		labelX: 110,
		labelY: 132,
	},
	{
		id: 'latin-a-card',
		symbolId: 'latin-a',
		width: 220,
		height: 140,
		guidePath: 'M20 120 L110 20 L200 120',
		elements: [
			{ type: 'dot', x: 56, y: 88 },
			{ type: 'dash', x: 118, y: 88, width: 64 },
		],
		labelX: 110,
		labelY: 132,
	},
	{
		id: 'latin-n-card',
		symbolId: 'latin-n',
		width: 220,
		height: 140,
		guidePath: 'M36 120 L36 20 L186 120 L186 20',
		elements: [
			{ type: 'dash', x: 64, y: 90, width: 62 },
			{ type: 'dot', x: 152, y: 90 },
		],
		labelX: 110,
		labelY: 132,
	},
	{
		id: 'latin-o-card',
		symbolId: 'latin-o',
		width: 220,
		height: 140,
		guidePath: 'M58 70 A52 42 0 1 1 162 70 A52 42 0 1 1 58 70',
		elements: [
			{ type: 'dash', x: 58, y: 92, width: 38 },
			{ type: 'dash', x: 102, y: 92, width: 38 },
			{ type: 'dash', x: 146, y: 92, width: 38 },
		],
		labelX: 110,
		labelY: 132,
	},
	{
		id: 'latin-i-card',
		symbolId: 'latin-i',
		width: 220,
		height: 140,
		guidePath: 'M60 24 L60 118 M160 24 L160 118 M60 70 L160 70',
		elements: [
			{ type: 'dot', x: 90, y: 92 },
			{ type: 'dot', x: 132, y: 92 },
		],
		labelX: 110,
		labelY: 132,
	},
]

export const VISUAL_MNEMONICS: VisualMnemonic[] = RAW_MNEMONICS.filter(
	(item) => Boolean(getSymbolById(item.symbolId)),
)

const bySymbol = new Map<string, VisualMnemonic>()
for (const mnemonic of VISUAL_MNEMONICS) {
	bySymbol.set(mnemonic.symbolId, mnemonic)
}

export function getVisualMnemonicBySymbolId (
	symbolId: string,
): VisualMnemonic | undefined {
	return bySymbol.get(symbolId)
}
