import { readFileSync } from 'node:fs'
import vitePluginApiBuilder from './dist'

const envFile = readFileSync('.env.self', { encoding: 'utf-8' })
const env: Record<string, string> = {}
envFile.trim().split(/\s*\n\s*/).forEach(line => {
	const [key, value] = line.trim().split(/\s*=\s*/)
	console.log(value.trim())
	try {
		env[key.trim()] = JSON.parse(value.trim())
	} catch (e) {
		env[key.trim()] = value.trim()
	}
})

vitePluginApiBuilder({
	useLock: false,
	output: {
		api: './testOutput/api',
		typed: './testOutput/typed',
		useTypeScript: true,
		autoMkDir: true,
	},
	primaryNames: [
		{
			namespace: 'mallapi',
			primaryName: 'mallapi',
		}
	],
	swagger: env.VITE_APP_SWAGGER_URL,
	apiImports: [
		`import type { RequestOptionProps } from '@/api/http.typed'`,
		`import { post, get, put } from '@/api/http'`,
	]
})
