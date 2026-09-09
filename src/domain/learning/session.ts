import { getCourseById } from './courses'
import type { Lesson, LessonQuestion, LessonSession, LessonStageKind } from './types'

export type RandomLike = {
	next: () => number
}

export function createSeededRandom (seed: number): RandomLike {
	let state = seed >>> 0
	return {
		next () {
			state = (1664525 * state + 1013904223) >>> 0
			return state / 0x100000000
		},
	}
}

function pickN (pool: string[], count: number, random: RandomLike): string[] {
	if (pool.length <= count) {
		return [...pool]
	}
	const copy = [...pool]
	for (let i = copy.length - 1; i > 0; i -= 1) {
		const j = Math.floor(random.next() * (i + 1))
		const t = copy[i]
		copy[i] = copy[j]
		copy[j] = t
	}
	return copy.slice(0, count)
}

export function generateQuestionOptions (
	answerSymbolId: string,
	allowedPool: string[],
	random: RandomLike,
): string[] {
	const uniquePool = [...new Set(allowedPool)].filter((id) => id !== answerSymbolId)
	const distractors = pickN(uniquePool, 3, random)
	const options = [answerSymbolId, ...distractors]
	const deduped = [...new Set(options)]
	let guard = 0
	while (deduped.length < 4 && uniquePool.length > 0 && guard < 100) {
		const pick = uniquePool[Math.floor(random.next() * uniquePool.length)]
		if (!deduped.includes(pick)) {
			deduped.push(pick)
		}
		guard += 1
	}
	if (!deduped.includes(answerSymbolId)) {
		deduped.unshift(answerSymbolId)
	}
	for (let i = deduped.length - 1; i > 0; i -= 1) {
		const j = Math.floor(random.next() * (i + 1))
		const t = deduped[i]
		deduped[i] = deduped[j]
		deduped[j] = t
	}
	if (deduped.length < 4) {
		throw new Error(`Not enough options to build 4-choice question for ${answerSymbolId}`)
	}
	return deduped.slice(0, 4)
}

function makeQuestions (
	stage: LessonStageKind,
	count: number,
	answerPool: string[],
	optionPool: string[],
	random: RandomLike,
	offset: number,
): LessonQuestion[] {
	const questions: LessonQuestion[] = []
	for (let i = 0; i < count; i += 1) {
		const answer = answerPool[Math.floor(random.next() * answerPool.length)]
		questions.push({
			id: `${stage}-${offset + i + 1}`,
			symbolId: answer,
			optionSymbolIds: generateQuestionOptions(answer, optionPool, random),
			stage,
		})
	}
	return questions
}

export function generateLessonSession (
	lesson: Lesson,
	knownBeforeLesson: string[],
	seed: number,
): LessonSession {
	const random = createSeededRandom(seed)
	const lessonPool = [...new Set([...lesson.reviewSymbolIds, ...lesson.newSymbolIds])]
	const safeKnown = knownBeforeLesson.filter((id) => lessonPool.includes(id))
	const recognitionPool = lesson.newSymbolIds.length > 0 ? lesson.newSymbolIds : lessonPool
	const reviewPool = safeKnown.length > 0 ? safeKnown : lessonPool
	const miniPool = lessonPool
	const courseSymbolPool =
		getCourseById(lesson.courseId)?.lessons
			.flatMap((item) => [...item.newSymbolIds, ...item.reviewSymbolIds])
			.filter((id, index, arr) => arr.indexOf(id) === index) ?? []
	const optionPool = [...new Set([...lessonPool, ...courseSymbolPool.slice(0, 8)])]

	const recognition = makeQuestions(
		'recognition',
		lesson.questionCount.recognition,
		recognitionPool,
		optionPool,
		random,
		0,
	)
	const review = makeQuestions(
		'review',
		lesson.questionCount.review,
		reviewPool,
		optionPool,
		random,
		recognition.length,
	)
	const miniCheck = makeQuestions(
		'mini-check',
		lesson.questionCount.miniCheck,
		miniPool,
		optionPool,
		random,
		recognition.length + review.length,
	)

	return {
		lesson,
		questions: [...recognition, ...review, ...miniCheck],
	}
}
