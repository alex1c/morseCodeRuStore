/**
 * Learning guide — ordered topics for the in-app «Обучение» section.
 */

export type {
	LearningActionRoute,
	LearningDemoKind,
	LearningTopic,
	LearningTopicAction,
} from './topics'
export {
	EXPECTED_LEARNING_TOPIC_IDS,
	LEARNING_DEMO_SYMBOL_IDS,
	LEARNING_TOPICS,
	assertLearningTopicsValid,
	getLearningTopicById,
	listLearningDemoSymbolIds,
} from './topics'
