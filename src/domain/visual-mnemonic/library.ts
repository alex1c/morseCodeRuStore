/**
 * Visual mnemonic library — SVG guide paths + ordered Morse elements.
 * Elements follow Morse order and sit on strokes that echo the letter form.
 */

import { getSymbolById } from '@/src/domain/morse'
import type { VisualMnemonic } from './types'

const RAW_MNEMONICS: VisualMnemonic[] = [
	// ── Russian (existing) ──────────────────────────────────────────
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
		guidePath:
			'M170 32 C132 6, 52 20, 54 62 C56 90, 102 94, 146 104 C182 112, 176 132, 56 118',
		elements: [
			{ type: 'dot', x: 74, y: 92 },
			{ type: 'dot', x: 110, y: 92 },
			{ type: 'dot', x: 146, y: 92 },
		],
		labelX: 110,
		labelY: 132,
	},

	// ── Russian (Phase 9 expansion) ─────────────────────────────────
	// Б (-...): stem dash, then three bowl dots top→bottom.
	{
		id: 'ru-b-card',
		symbolId: 'ru-b',
		width: 220,
		height: 140,
		guidePath:
			'M48 22 L48 118 M48 22 L132 22 C168 22, 168 62, 132 62 L48 62 M48 62 L140 62 C178 62, 178 118, 140 118 L48 118',
		elements: [
			{ type: 'dash', x: 36, y: 70, width: 28 },
			{ type: 'dot', x: 118, y: 42 },
			{ type: 'dot', x: 130, y: 72 },
			{ type: 'dot', x: 124, y: 104 },
		],
		labelX: 110,
		labelY: 132,
	},
	// В (.--): top bowl dot, then two stem/base dashes.
	{
		id: 'ru-v-card',
		symbolId: 'ru-v',
		width: 220,
		height: 140,
		guidePath:
			'M52 22 L52 118 M52 22 L128 22 C164 22, 164 60, 128 60 L52 60 M52 60 L142 60 C180 60, 180 118, 142 118 L52 118',
		elements: [
			{ type: 'dot', x: 118, y: 40 },
			{ type: 'dash', x: 68, y: 72, width: 56 },
			{ type: 'dash', x: 68, y: 104, width: 72 },
		],
		labelX: 110,
		labelY: 132,
	},
	// Г (--.): top arm dash, stem dash, tip dot.
	{
		id: 'ru-g-card',
		symbolId: 'ru-g',
		width: 220,
		height: 140,
		guidePath: 'M52 28 L178 28 L178 48 M52 28 L52 118',
		elements: [
			{ type: 'dash', x: 70, y: 42, width: 88 },
			{ type: 'dash', x: 40, y: 78, width: 28 },
			{ type: 'dot', x: 164, y: 42 },
		],
		labelX: 110,
		labelY: 132,
	},
	// Д (-..): base dash under A-like roof, two leg dots.
	{
		id: 'ru-d-card',
		symbolId: 'ru-d',
		width: 220,
		height: 140,
		guidePath: 'M40 100 L110 22 L180 100 M28 118 L192 118',
		elements: [
			{ type: 'dash', x: 58, y: 112, width: 104 },
			{ type: 'dot', x: 72, y: 86 },
			{ type: 'dot', x: 148, y: 86 },
		],
		labelX: 110,
		labelY: 132,
	},
	// Е (.): open E bars; single center-line dot (same idea as latin-e).
	{
		id: 'ru-e-card',
		symbolId: 'ru-e',
		width: 220,
		height: 140,
		guidePath: 'M160 24 L62 24 L62 118 L162 118 M62 70 L142 70',
		elements: [{ type: 'dot', x: 110, y: 92 }],
		labelX: 110,
		labelY: 132,
	},
	// Ж (...-): X+spine; three wing dots then center dash.
	{
		id: 'ru-zh-card',
		symbolId: 'ru-zh',
		width: 220,
		height: 140,
		guidePath:
			'M40 28 L110 70 L40 112 M180 28 L110 70 L180 112 M110 22 L110 118',
		elements: [
			{ type: 'dot', x: 58, y: 42 },
			{ type: 'dot', x: 162, y: 42 },
			{ type: 'dot', x: 58, y: 100 },
			{ type: 'dash', x: 86, y: 70, width: 48 },
		],
		labelX: 110,
		labelY: 132,
	},
	// З (--..): S-like 3; two curve dashes then two dots.
	{
		id: 'ru-z-card',
		symbolId: 'ru-z',
		width: 220,
		height: 140,
		guidePath:
			'M58 36 C110 10, 180 28, 150 62 C120 92, 170 108, 110 128 C70 140, 48 122, 70 110',
		elements: [
			{ type: 'dash', x: 96, y: 40, width: 52 },
			{ type: 'dash', x: 108, y: 72, width: 48 },
			{ type: 'dot', x: 128, y: 100 },
			{ type: 'dot', x: 92, y: 114 },
		],
		labelX: 110,
		labelY: 132,
	},
	// Й (.---): И shape + breve; leading tip dot then three bar dashes.
	{
		id: 'ru-j-card',
		symbolId: 'ru-j',
		width: 220,
		height: 140,
		guidePath:
			'M50 34 L50 118 M170 34 L170 118 M50 70 L170 70 M78 18 Q110 4 142 18',
		elements: [
			{ type: 'dot', x: 110, y: 22 },
			{ type: 'dash', x: 42, y: 88, width: 32 },
			{ type: 'dash', x: 94, y: 88, width: 32 },
			{ type: 'dash', x: 146, y: 88, width: 32 },
		],
		labelX: 110,
		labelY: 132,
	},
	// К (-.-): shared with latin-k — arms as dash-dot-dash.
	{
		id: 'ru-k-card',
		symbolId: 'ru-k',
		width: 220,
		height: 140,
		guidePath: 'M56 22 L56 118 M56 70 L178 28 M56 70 L178 112',
		elements: [
			{ type: 'dash', x: 44, y: 70, width: 36 },
			{ type: 'dot', x: 118, y: 58 },
			{ type: 'dash', x: 118, y: 96, width: 52 },
		],
		labelX: 110,
		labelY: 132,
	},
	// Л (.-..): tent roof; tip dot, ridge dash, two foot dots.
	{
		id: 'ru-l-card',
		symbolId: 'ru-l',
		width: 220,
		height: 140,
		guidePath: 'M36 118 L110 24 L184 118',
		elements: [
			{ type: 'dot', x: 110, y: 40 },
			{ type: 'dash', x: 78, y: 78, width: 64 },
			{ type: 'dot', x: 58, y: 108 },
			{ type: 'dot', x: 162, y: 108 },
		],
		labelX: 110,
		labelY: 132,
	},
	// М (--): peaks as two dashes (shared idea with latin-m).
	{
		id: 'ru-m-card',
		symbolId: 'ru-m',
		width: 220,
		height: 140,
		guidePath: 'M28 118 L28 28 L110 96 L192 28 L192 118',
		elements: [
			{ type: 'dash', x: 40, y: 48, width: 52 },
			{ type: 'dash', x: 128, y: 48, width: 52 },
		],
		labelX: 110,
		labelY: 132,
	},
	// П (.--.): pi top; corner dots + top bar as two dashes.
	{
		id: 'ru-p-card',
		symbolId: 'ru-p',
		width: 220,
		height: 140,
		guidePath: 'M48 28 L172 28 M48 28 L48 118 M172 28 L172 118',
		elements: [
			{ type: 'dot', x: 48, y: 48 },
			{ type: 'dash', x: 66, y: 36, width: 44 },
			{ type: 'dash', x: 118, y: 36, width: 44 },
			{ type: 'dot', x: 172, y: 48 },
		],
		labelX: 110,
		labelY: 132,
	},
	// Р (.-.): P bowl; tip dot, stem dash, bowl dot.
	{
		id: 'ru-r-card',
		symbolId: 'ru-r',
		width: 220,
		height: 140,
		guidePath:
			'M56 22 L56 118 M56 22 L138 22 C176 22, 176 70, 138 70 L56 70',
		elements: [
			{ type: 'dot', x: 118, y: 36 },
			{ type: 'dash', x: 44, y: 78, width: 36 },
			{ type: 'dot', x: 132, y: 56 },
		],
		labelX: 110,
		labelY: 132,
	},
	// У (..-): Y fork; two arm dots then stem dash.
	{
		id: 'ru-u-card',
		symbolId: 'ru-u',
		width: 220,
		height: 140,
		guidePath: 'M40 28 L110 78 L180 28 M110 78 L110 118',
		elements: [
			{ type: 'dot', x: 58, y: 42 },
			{ type: 'dot', x: 162, y: 42 },
			{ type: 'dash', x: 86, y: 100, width: 48 },
		],
		labelX: 110,
		labelY: 132,
	},
	// Ф (..-.): phi; left dots, bar dash, right dot.
	{
		id: 'ru-f-card',
		symbolId: 'ru-f',
		width: 220,
		height: 140,
		guidePath:
			'M110 18 L110 122 M58 70 A52 36 0 1 1 162 70 A52 36 0 1 1 58 70',
		elements: [
			{ type: 'dot', x: 70, y: 58 },
			{ type: 'dot', x: 70, y: 86 },
			{ type: 'dash', x: 92, y: 70, width: 36 },
			{ type: 'dot', x: 156, y: 70 },
		],
		labelX: 110,
		labelY: 132,
	},
	// Х (....): X tips as four dots in reading order.
	{
		id: 'ru-h-card',
		symbolId: 'ru-h',
		width: 220,
		height: 140,
		guidePath: 'M40 28 L180 112 M180 28 L40 112',
		elements: [
			{ type: 'dot', x: 52, y: 40 },
			{ type: 'dot', x: 168, y: 40 },
			{ type: 'dot', x: 52, y: 100 },
			{ type: 'dot', x: 168, y: 100 },
		],
		labelX: 110,
		labelY: 132,
	},
	// Ц (-.-.): U body + spur; dash-dot-dash-dot along contour.
	{
		id: 'ru-c-card',
		symbolId: 'ru-c',
		width: 220,
		height: 140,
		guidePath:
			'M48 28 L48 96 Q48 118 110 118 Q172 118 172 96 L172 28 M172 118 L196 118 L196 96',
		elements: [
			{ type: 'dash', x: 36, y: 56, width: 28 },
			{ type: 'dot', x: 78, y: 108 },
			{ type: 'dash', x: 128, y: 56, width: 40 },
			{ type: 'dot', x: 188, y: 108 },
		],
		labelX: 110,
		labelY: 132,
	},
	// Ч (---.): four-like; three body dashes then spur tip dot.
	{
		id: 'ru-ch-card',
		symbolId: 'ru-ch',
		width: 220,
		height: 140,
		guidePath: 'M48 28 L48 78 L160 78 L160 28 M160 78 L160 118',
		elements: [
			{ type: 'dash', x: 36, y: 48, width: 28 },
			{ type: 'dash', x: 72, y: 70, width: 56 },
			{ type: 'dash', x: 148, y: 48, width: 28 },
			{ type: 'dot', x: 160, y: 104 },
		],
		labelX: 110,
		labelY: 132,
	},
	// Ш (----): three stems + base as four dashes left→right / base.
	{
		id: 'ru-sh-card',
		symbolId: 'ru-sh',
		width: 220,
		height: 140,
		guidePath:
			'M40 28 L40 108 M110 28 L110 108 M180 28 L180 108 M40 108 L180 108',
		elements: [
			{ type: 'dash', x: 28, y: 60, width: 28 },
			{ type: 'dash', x: 96, y: 60, width: 28 },
			{ type: 'dash', x: 166, y: 60, width: 28 },
			{ type: 'dash', x: 56, y: 108, width: 108 },
		],
		labelX: 110,
		labelY: 132,
	},
	// Щ (--.-): Ш + tail; two stem dashes, mid dot, base/tail dash.
	{
		id: 'ru-shh-card',
		symbolId: 'ru-shh',
		width: 220,
		height: 140,
		guidePath:
			'M32 28 L32 108 M96 28 L96 108 M160 28 L160 108 M32 108 L160 108 L188 108 L188 88',
		elements: [
			{ type: 'dash', x: 24, y: 60, width: 28 },
			{ type: 'dash', x: 86, y: 60, width: 28 },
			{ type: 'dot', x: 160, y: 60 },
			{ type: 'dash', x: 48, y: 108, width: 120 },
		],
		labelX: 110,
		labelY: 132,
	},
	// Ы (-.--): soft-sign + stem; dash then three right-side elements.
	{
		id: 'ru-y-card',
		symbolId: 'ru-y',
		width: 220,
		height: 140,
		guidePath:
			'M40 22 L40 118 M40 70 C88 70, 88 118, 40 118 M150 22 L150 118',
		elements: [
			{ type: 'dash', x: 28, y: 48, width: 28 },
			{ type: 'dot', x: 72, y: 92 },
			{ type: 'dash', x: 138, y: 56, width: 28 },
			{ type: 'dash', x: 138, y: 96, width: 28 },
		],
		labelX: 110,
		labelY: 132,
	},
	// Ь (-..-): soft sign; stem dash, bowl dots, closing dash.
	{
		id: 'ru-soft-card',
		symbolId: 'ru-soft',
		width: 220,
		height: 140,
		guidePath: 'M70 22 L70 118 M70 70 C130 70, 130 118, 70 118',
		elements: [
			{ type: 'dash', x: 58, y: 44, width: 28 },
			{ type: 'dot', x: 104, y: 86 },
			{ type: 'dot', x: 104, y: 108 },
			{ type: 'dash', x: 86, y: 70, width: 44 },
		],
		labelX: 110,
		labelY: 132,
	},
	// Э (..-..): mirrored E; dots on open side around a mid dash.
	{
		id: 'ru-e2-card',
		symbolId: 'ru-e2',
		width: 220,
		height: 140,
		guidePath:
			'M60 28 C150 10, 190 40, 190 70 C190 100, 150 130, 60 112 M100 70 L190 70',
		elements: [
			{ type: 'dot', x: 96, y: 40 },
			{ type: 'dot', x: 140, y: 40 },
			{ type: 'dash', x: 118, y: 70, width: 52 },
			{ type: 'dot', x: 140, y: 100 },
			{ type: 'dot', x: 96, y: 100 },
		],
		labelX: 110,
		labelY: 132,
	},
	// Ю (..--): O + stem; two left dots then two right dashes.
	{
		id: 'ru-yu-card',
		symbolId: 'ru-yu',
		width: 220,
		height: 140,
		guidePath:
			'M48 22 L48 118 M48 70 L92 70 M108 70 A40 40 0 1 1 188 70 A40 40 0 1 1 108 70',
		elements: [
			{ type: 'dot', x: 48, y: 44 },
			{ type: 'dot', x: 48, y: 96 },
			{ type: 'dash', x: 120, y: 56, width: 44 },
			{ type: 'dash', x: 120, y: 88, width: 44 },
		],
		labelX: 110,
		labelY: 132,
	},
	// Я (.-.-): mirrored R; tip dot, stem dash, bowl dash, foot dot.
	{
		id: 'ru-ya-card',
		symbolId: 'ru-ya',
		width: 220,
		height: 140,
		guidePath:
			'M168 22 L168 118 M168 22 L90 22 C52 22, 52 70, 90 70 L168 70 M120 70 L56 118',
		elements: [
			{ type: 'dot', x: 110, y: 36 },
			{ type: 'dash', x: 156, y: 78, width: 28 },
			{ type: 'dash', x: 96, y: 62, width: 48 },
			{ type: 'dot', x: 72, y: 104 },
		],
		labelX: 110,
		labelY: 132,
	},

	// ── Latin (existing) ────────────────────────────────────────────
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

	// ── Latin (Phase 9 expansion: K M D U S R) ───────────────────────
	{
		id: 'latin-k-card',
		symbolId: 'latin-k',
		width: 220,
		height: 140,
		guidePath: 'M56 22 L56 118 M56 70 L178 28 M56 70 L178 112',
		elements: [
			{ type: 'dash', x: 44, y: 70, width: 36 },
			{ type: 'dot', x: 118, y: 58 },
			{ type: 'dash', x: 118, y: 96, width: 52 },
		],
		labelX: 110,
		labelY: 132,
	},
	{
		id: 'latin-m-card',
		symbolId: 'latin-m',
		width: 220,
		height: 140,
		guidePath: 'M28 118 L28 28 L110 96 L192 28 L192 118',
		elements: [
			{ type: 'dash', x: 40, y: 48, width: 52 },
			{ type: 'dash', x: 128, y: 48, width: 52 },
		],
		labelX: 110,
		labelY: 132,
	},
	{
		id: 'latin-d-card',
		symbolId: 'latin-d',
		width: 220,
		height: 140,
		guidePath: 'M56 22 L56 118 M56 22 C150 22, 180 50, 180 70 C180 90, 150 118, 56 118',
		elements: [
			{ type: 'dash', x: 44, y: 70, width: 28 },
			{ type: 'dot', x: 118, y: 48 },
			{ type: 'dot', x: 118, y: 92 },
		],
		labelX: 110,
		labelY: 132,
	},
	{
		id: 'latin-u-card',
		symbolId: 'latin-u',
		width: 220,
		height: 140,
		guidePath: 'M48 28 L48 86 Q48 118 110 118 Q172 118 172 86 L172 28',
		elements: [
			{ type: 'dot', x: 48, y: 48 },
			{ type: 'dot', x: 172, y: 48 },
			{ type: 'dash', x: 78, y: 108, width: 64 },
		],
		labelX: 110,
		labelY: 132,
	},
	{
		id: 'latin-s-card',
		symbolId: 'latin-s',
		width: 220,
		height: 140,
		guidePath:
			'M170 32 C132 6, 52 20, 54 62 C56 90, 102 94, 146 104 C182 112, 176 132, 56 118',
		elements: [
			{ type: 'dot', x: 74, y: 92 },
			{ type: 'dot', x: 110, y: 92 },
			{ type: 'dot', x: 146, y: 92 },
		],
		labelX: 110,
		labelY: 132,
	},
	{
		id: 'latin-r-card',
		symbolId: 'latin-r',
		width: 220,
		height: 140,
		guidePath:
			'M56 22 L56 118 M56 22 L138 22 C176 22, 176 70, 138 70 L56 70 M112 70 L176 118',
		elements: [
			{ type: 'dot', x: 118, y: 36 },
			{ type: 'dash', x: 44, y: 78, width: 36 },
			{ type: 'dot', x: 148, y: 96 },
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
