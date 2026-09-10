/**
 * Learning guide domain invariants.
 */

import {
	EXPECTED_LEARNING_TOPIC_IDS,
	LEARNING_TOPICS,
	assertLearningTopicsValid,
	getLearningTopicById,
	getSymbolById,
	listLearningDemoSymbolIds,
} from '@/src/domain'

describe('learning guide', () => {
	test('all expected topics are defined', () => {
		expect(LEARNING_TOPICS).toHaveLength(EXPECTED_LEARNING_TOPIC_IDS.length)
		for (const id of EXPECTED_LEARNING_TOPIC_IDS) {
			expect(getLearningTopicById(id)).toBeDefined()
		}
	})

	test('topic ids are unique', () => {
		const ids = LEARNING_TOPICS.map((topic) => topic.id)
		expect(new Set(ids).size).toBe(ids.length)
	})

	test('topics follow the expected order', () => {
		expect(LEARNING_TOPICS.map((topic) => topic.id)).toEqual([
			...EXPECTED_LEARNING_TOPIC_IDS,
		])
	})

	test('referenced demo symbols exist in the Morse catalog', () => {
		for (const symbolId of listLearningDemoSymbolIds()) {
			expect(getSymbolById(symbolId)).toBeDefined()
		}
	})

	test('assertLearningTopicsValid passes', () => {
		expect(assertLearningTopicsValid()).toEqual([])
	})
})
