/**
 * Learning guide topics for the «Обучение» section.
 * Content is ordered for first-time product orientation (ear-first).
 */

import { getSymbolById } from '@/src/domain/morse'
import type { RootStackParamList } from '@/src/navigation/types'

/** Interactive demo kinds rendered inside LearningScreen topic cards. */
export type LearningDemoKind =
	| 'morse-example'
	| 'wpm'
	| 'farnsworth'
	| 'mnemonic'

/**
 * Navigation target for a topic CTA.
 * `first-lesson` → Lesson; `demo-only` → no route (play UI handles it).
 */
export type LearningActionRoute =
	| keyof RootStackParamList
	| 'first-lesson'
	| 'demo-only'

export type LearningTopicAction = {
	label: string
	route: LearningActionRoute
}

export type LearningTopic = {
	id: string
	title: string
	paragraphs: string[]
	action?: LearningTopicAction
	demo?: LearningDemoKind
}

/**
 * Catalog symbol ids used by demos — kept here so tests can validate them.
 * Farnsworth uses АН (ru-a + ru-n); mnemonic shows А and Т.
 */
export const LEARNING_DEMO_SYMBOL_IDS = {
	morseExample: 'ru-a',
	wpmLetter: 'ru-a',
	farnsworth: ['ru-a', 'ru-n'] as const,
	mnemonic: ['ru-a', 'ru-t'] as const,
} as const

/** Canonical topic order — assertLearningTopicsValid checks array matches this. */
export const EXPECTED_LEARNING_TOPIC_IDS = [
	'what-is-morse',
	'learn-by-ear',
	'visual-alphabet',
	'how-lessons-work',
	'wpm',
	'farnsworth',
	'receive',
	'transmit',
	'my-errors',
	'words-phrases',
] as const

export const LEARNING_TOPICS: LearningTopic[] = [
	{
		id: 'what-is-morse',
		title: 'Что такое азбука Морзе',
		paragraphs: [
			'Азбука Морзе — это код из коротких и длинных сигналов: точек и тире.',
			'Каждая буква и цифра имеет свой устойчивый ритм — его можно узнать на слух.',
			'В тренажёре вы сначала слышите сигнал, а уже потом связываете его с буквой.',
		],
		demo: 'morse-example',
		action: { label: 'Прослушать пример', route: 'demo-only' },
	},
	{
		id: 'learn-by-ear',
		title: 'Почему учимся на слух',
		paragraphs: [
			'Главный навык оператора — узнавать буквы по звучанию, а не «считать» точки на экране.',
			'Визуальные подсказки помогают на старте, но постепенно уходят на второй план.',
			'Так формируется привычка принимать сигнал в реальном времени.',
		],
	},
	{
		id: 'visual-alphabet',
		title: 'Визуальная азбука',
		paragraphs: [
			'Карточки с образами — стартовая подсказка: форма помогает запомнить ритм буквы.',
			'Это опора в первых уроках, а не замена слуха.',
			'Можно мягко «запомнить образ», но цель — услышать букву без картинки.',
		],
		demo: 'mnemonic',
	},
	{
		id: 'how-lessons-work',
		title: 'Как устроены уроки',
		paragraphs: [
			'Урок знакомит с новыми символами, даёт узнавание на слух и короткую проверку.',
			'Сначала можно опереться на визуальную карточку, затем ответы идут только по звуку.',
			'Пройденный урок открывает следующий шаг в курсе.',
		],
		action: { label: 'Попробовать', route: 'Lesson' },
	},
	{
		id: 'wpm',
		title: 'Скорость WPM',
		paragraphs: [
			'WPM (words per minute) задаёт скорость элементов внутри буквы: точки, тире и паузы между ними.',
			'Одна и та же буква на 8, 12 и 20 WPM звучит по-разному — ритм сжимается.',
			'В настройках можно выбрать комфортную скорость и повышать её постепенно.',
		],
		demo: 'wpm',
	},
	{
		id: 'farnsworth',
		title: 'Интервалы / Farnsworth',
		paragraphs: [
			'Метод Farnsworth сохраняет «быстрые» буквы, но растягивает паузы между буквами и словами.',
			'Так проще различать символы, не привыкая к слишком медленному звучанию самой буквы.',
			'Сравните «АН» с обычными и удвоенными интервалами при той же скорости буквы.',
		],
		demo: 'farnsworth',
	},
	{
		id: 'receive',
		title: 'Приём на слух',
		paragraphs: [
			'Режим «Приём» — основная тренировка: вы слушаете сигнал и вводите ответ.',
			'Можно практиковать буквы, группы, слова и фразы с разной скоростью.',
			'Ошибки накапливаются в статистике и помогают подстроить следующие сессии.',
		],
		action: { label: 'Открыть приём', route: 'Receive' },
	},
	{
		id: 'transmit',
		title: 'Передача',
		paragraphs: [
			'В «Передаче» вы сами набиваете точки и тире — развиваете ритм и ключ.',
			'Тренажёр сравнивает ваш сигнал с эталоном и показывает, где сбился ритм.',
			'Передача дополняет приём: слышать и отдавать — два связанных навыка.',
		],
		action: { label: 'Открыть передачу', route: 'Transmit' },
	},
	{
		id: 'my-errors',
		title: 'Мои ошибки',
		paragraphs: [
			'Раздел «Мои ошибки» собирает слабые буквы и частые путаницы.',
			'Отсюда удобно запустить короткую тренировку именно по проблемным символам.',
			'Регулярный разбор ошибок ускоряет прогресс сильнее, чем случайные сессии.',
		],
		action: { label: 'Смотреть ошибки', route: 'Errors' },
	},
	{
		id: 'words-phrases',
		title: 'Слова и фразы',
		paragraphs: [
			'После букв появляются группы, слова и короткие фразы — ближе к реальному эфиру.',
			'Слух учится держать несколько символов подряд и узнавать знакомые сочетания.',
			'Начинайте с коротких слов на комфортной скорости, затем усложняйте длину и WPM.',
		],
	},
]

export function getLearningTopicById (
	id: string,
): LearningTopic | undefined {
	return LEARNING_TOPICS.find((topic) => topic.id === id)
}

/**
 * Collect every catalog symbol id referenced by demos.
 * Used by assertLearningTopicsValid and unit tests.
 */
export function listLearningDemoSymbolIds (): string[] {
	const { morseExample, wpmLetter, farnsworth, mnemonic } =
		LEARNING_DEMO_SYMBOL_IDS
	return [...new Set([morseExample, wpmLetter, ...farnsworth, ...mnemonic])]
}

/**
 * Structural checks for tests / CI — returns human-readable error strings.
 * Empty array means the guide is consistent with the Morse catalog.
 */
export function assertLearningTopicsValid (): string[] {
	const errors: string[] = []
	const ids = LEARNING_TOPICS.map((topic) => topic.id)

	if (ids.length !== EXPECTED_LEARNING_TOPIC_IDS.length) {
		errors.push(
			`expected ${EXPECTED_LEARNING_TOPIC_IDS.length} topics, got ${ids.length}`,
		)
	}

	for (let i = 0; i < EXPECTED_LEARNING_TOPIC_IDS.length; i += 1) {
		const expected = EXPECTED_LEARNING_TOPIC_IDS[i]
		const actual = ids[i]
		if (actual !== expected) {
			errors.push(
				`topic order mismatch at index ${i}: expected "${expected}", got "${actual ?? 'undefined'}"`,
			)
		}
	}

	const seen = new Set<string>()
	for (const id of ids) {
		if (seen.has(id)) {
			errors.push(`duplicate topic id "${id}"`)
		}
		seen.add(id)
	}

	for (const symbolId of listLearningDemoSymbolIds()) {
		if (!getSymbolById(symbolId)) {
			errors.push(`demo references unknown symbol "${symbolId}"`)
		}
	}

	const validDemos: LearningDemoKind[] = [
		'morse-example',
		'wpm',
		'farnsworth',
		'mnemonic',
	]
	for (const topic of LEARNING_TOPICS) {
		if (topic.demo && !validDemos.includes(topic.demo)) {
			errors.push(
				`topic "${topic.id}" has invalid demo "${String(topic.demo)}"`,
			)
		}
		if (topic.paragraphs.length < 2 || topic.paragraphs.length > 5) {
			errors.push(
				`topic "${topic.id}" should have 2–5 paragraphs, got ${topic.paragraphs.length}`,
			)
		}
	}

	return errors
}
