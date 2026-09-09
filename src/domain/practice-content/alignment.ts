/**
 * Sequence alignment for listening answers (Levenshtein backtrace).
 * Prevents cascade errors when the learner skips/inserts a character.
 *
 * Operations:
 * - match: same character at aligned positions
 * - substitution: different characters
 * - missing: target char with no answer (deletion)
 * - extra: answer char with no target (insertion)
 */

export type AlignOperation =
	| 'match'
	| 'substitution'
	| 'missing'
	| 'extra'

export type AlignStep = {
	operation: AlignOperation
	targetChar: string | null
	answerChar: string | null
	/** 0-based index in the original target string, or null for extras. */
	targetIndex: number | null
	/** 0-based index in the original answer string, or null for missings. */
	answerIndex: number | null
}

export type AlignmentResult = {
	steps: AlignStep[]
	matches: number
	substitutions: number
	missings: number
	extras: number
	/** Exact full-string equality after normalization. */
	itemCorrect: boolean
	/** matches / targetLength (0 when target empty). */
	characterAccuracy: number
	targetLength: number
	answerLength: number
}

function normalizeForAlign (raw: string): string {
	return raw
		.replace(/\s+/g, ' ')
		.trim()
		.toUpperCase()
}

/**
 * Align target vs answer with classic DP + backtrace.
 * Spaces are significant characters (for phrases).
 */
export function alignListeningAnswer (
	targetRaw: string,
	answerRaw: string,
): AlignmentResult {
	const target = normalizeForAlign(targetRaw)
	const answer = normalizeForAlign(answerRaw)
	const n = target.length
	const m = answer.length

	const dist: number[][] = Array.from({ length: n + 1 }, () =>
		Array.from({ length: m + 1 }, () => 0),
	)
	for (let i = 0; i <= n; i += 1) {
		dist[i][0] = i
	}
	for (let j = 0; j <= m; j += 1) {
		dist[0][j] = j
	}

	for (let i = 1; i <= n; i += 1) {
		for (let j = 1; j <= m; j += 1) {
			const cost = target[i - 1] === answer[j - 1] ? 0 : 1
			dist[i][j] = Math.min(
				dist[i - 1][j] + 1, // deletion (missing in answer)
				dist[i][j - 1] + 1, // insertion (extra in answer)
				dist[i - 1][j - 1] + cost, // match / substitution
			)
		}
	}

	const stepsRev: AlignStep[] = []
	let i = n
	let j = m
	while (i > 0 || j > 0) {
		if (i > 0 && j > 0) {
			const cost = target[i - 1] === answer[j - 1] ? 0 : 1
			if (dist[i][j] === dist[i - 1][j - 1] + cost) {
				stepsRev.push({
					operation: cost === 0 ? 'match' : 'substitution',
					targetChar: target[i - 1],
					answerChar: answer[j - 1],
					targetIndex: i - 1,
					answerIndex: j - 1,
				})
				i -= 1
				j -= 1
				continue
			}
		}
		if (i > 0 && dist[i][j] === dist[i - 1][j] + 1) {
			stepsRev.push({
				operation: 'missing',
				targetChar: target[i - 1],
				answerChar: null,
				targetIndex: i - 1,
				answerIndex: null,
			})
			i -= 1
			continue
		}
		stepsRev.push({
			operation: 'extra',
			targetChar: null,
			answerChar: answer[j - 1],
			targetIndex: null,
			answerIndex: j - 1,
		})
		j -= 1
	}

	const steps = stepsRev.reverse()
	const matches = steps.filter((s) => s.operation === 'match').length
	const substitutions = steps.filter((s) => s.operation === 'substitution').length
	const missings = steps.filter((s) => s.operation === 'missing').length
	const extras = steps.filter((s) => s.operation === 'extra').length
	const itemCorrect = n === m && substitutions === 0 && missings === 0 && extras === 0
	const characterAccuracy = n === 0 ? 0 : matches / n

	return {
		steps,
		matches,
		substitutions,
		missings,
		extras,
		itemCorrect,
		characterAccuracy,
		targetLength: n,
		answerLength: m,
	}
}
