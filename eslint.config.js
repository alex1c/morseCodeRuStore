// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')

module.exports = defineConfig([
	...expoConfig,
	{
		ignores: [
			'dist/*',
			'dist-smoke/*',
			'node_modules/*',
			'.expo/*',
			'android/*',
			'ios/*',
			'coverage/*',
			'scripts/*',
			'release-artifacts/**/*.html',
		],
	},
])
