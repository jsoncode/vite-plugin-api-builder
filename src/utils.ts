import { exec } from 'child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import * as http from 'node:http'
import * as https from 'node:https'
import { platform } from 'node:os'
import * as path from 'node:path'
import { resolve } from 'node:path'
import type {
	ApiBuilderConfig,
	ApiFoxDetail,
	ApiFoxDetailParameters,
	ApiFoxSchema,
	ReqMethod,
	ReqOptions,
	SwaggerJson
} from './index.typed'

const lineN = platform() === 'win32' ? '\r\n' : '\n'

const typeMap: { [key: string]: string } = {
	byte: 'number',
	short: 'number',
	int: 'number',
	long: 'number',
	float: 'number',
	double: 'number',
	integer: 'number',
	number: 'number',

	char: 'string',
	string: 'string',
	text: 'string',
	longText: 'string',

	boolean: 'boolean',
	any: 'any',
	object: 'any',
	file: 'File',
	formData: 'FormData',
	array: 'any[]',
	JSONArray: 'any[]'
}

const groupTypeMap: { [key: string]: string } = {
	File: 'FileType',// 后台自定义的file类型
	URI: 'URIType',
	URL: 'URLType',
	Record: 'RecordType',
}

const valueMap: any = {
	integer: '0',
	long: '0',
	byte: '0',
	short: '0',
	float: '0',
	double: '0',
	number: '0',
	char: '\'\'',
	string: '\'\'',
	boolean: 'false',
	any: '{}',
	array: '[]',
	'number[]': '[]',
	'string[]': '[]',
	'boolean[]': '[]',
	'array[]': '[]',
	'any[]': '[]'
}
/**
 * 前后端基本类型的映射
 * @param type
 */
export const getSingleType = (type: string = ''): string => {
	return typeMap[type] || type
}

// 提取被引用的类型
export const getReferenceType = (k: string): string => {
	const keyList = k.split('/')
	const key = keyList[keyList.length - 1]
	if (isReference('«')) {
		if (/Map«([^«»,]+)\s*,\s*([^«»,]+)»/.test(key)) {
			const k = key.match(/Map«([^«»,]+)\s*,\s*([^«»,]+)»/)?.[1]
			const v = key.match(/Map«([^«»,]+)\s*,\s*([^«»,]+)»/)?.[2]
			if (k === 'string') {
				if (v) {
					if (typeMap[v] || groupTypeMap[v]) {
						return `{[key: ${k}]: ${typeMap[v] || groupTypeMap[v]}}`
					} else {
						return `{[key: ${k}]: ${v}}`
					}
				}
				return 'MapObj'
			}
			return 'any'
		}
		let list: string[] = key.match(/[^«»,\s\/]+/g) || []
		if (list[0] === 'R' || list[0] === 'ReturnT') {
			list.shift()
		}
		list = list.map(i => {
			if (/^(File|URL|URI|Record)$/.test(i)) {
				return i + 'Type'
			} else {
				return i
			}
		})
		if (list[0] === 'List') {
			list.shift()
			return list.join('') + '[]'
		}
		return list.join('')
	}
	return key
}

// 判断ref 是否包含引用类型
export const isReference = (key: string): boolean => {
	return key.includes('«')
}
/**
 * 从$ref的值中识别出类型
 * @param key
 */
export const getRefType = (key: string = ''): string => {
	if (!key) {
		return ''
	}
	let match = getReferenceType(key)
	if (!isReference(key)) {
		match = key.match(/([^/]+)$/)?.[1] || ''
	}
	return groupTypeMap[match] || getSingleType(match)
}
export const getRefTypeApiFox = (key: string = '', schemaList: ApiFoxSchema[]): string => {
	if (!key) {
		return ''
	}
	let match = ''
	let id = key.match(/\d+$/)?.[0]
	if (id) {
		const schema = schemaList.find(i => i.id.toString() === id)
		if (schema) {
			match = getReferenceType(schema.name)
		}
	} else {
		match = key.match(/([^/]+)$/)?.[1] || ''
	}
	return getSingleType(match)
}

export function getDomain(url: string): string {
	if (!url) {
		return url
	}
	return url.match(/^https?:\/\/[^/]+/)?.[0] || ''
}

export async function getSwaggerDoc(options: ReqOptions): Promise<any> {
	return new Promise(resolve => {
		const fn = options.url.startsWith('https') ? https : http
		fn.get(
			options.url,
			{
				headers: {
					Referer: options.url,
					'Accept-Charset': 'utf-8',
					...(options.headers || {})
				}
			},
			resp => {
				let data = ''
				resp.setEncoding('utf8')
				// 数据分块接收
				resp.on('data', chunk => {
					data += chunk
				})

				// 响应结束，处理完整的数据
				resp.on('end', () => {
					try {
						const jsonData = JSON.parse(data) // 将 JSON 字符串解析为对象
						resolve(jsonData)
					} catch (e) {
						resolve(null)
					}
				})
			}
		).on('error', e => {
			console.log(e)
			resolve(null)
		})
	})
}

export function buildApiFox(apiList: ApiFoxDetail[], schemaList: ApiFoxSchema[], config: ApiBuilderConfig) {
	const fnMap: any = {}
	const req: any = {}
	apiList.forEach(i => {
		const fnName = i.operationId
		const desc = [
			i.tags.join('/'),
			i.name,
			i.description
		].join(' ')
		const jsonSchema = i.responses[0].jsonSchema
		const resType = jsonSchema?.type ? getSingleType(jsonSchema.type) : getRefTypeApiFox(jsonSchema.$ref, schemaList)
		// 处理请求参数
		const params: any = {}
		if (i.parameters) {
			Object.keys(i.parameters).forEach(p => {
				if (i.parameters[p as keyof ApiFoxDetailParameters].length) {
					params[p] = i.parameters[p as keyof ApiFoxDetailParameters].map(i => {
						return {
							...i,
							in: p
						}
					})
				}
			})
		}

		const { formData, ...otherParams } = params

		const paramsType: any = {}
		if (!fnName) {
			console.log('sub.operationId 是空的', i)
		}
		if (formData) {
			const key = upperFirstCase(fnName) + 'FormData'
			req[key] = getFormType({
				key,
				list: Object.keys(formData)
			})
			paramsType.formData = key
		}
		for (const k in otherParams) {
			const value: any = otherParams[k]

			if (value.req) {
				paramsType[k] = value.req.type
				continue
			}
			const key = upperFirstCase(fnName) + upperFirstCase(k)
			if (typeMap[key] || key === 'any') {
				continue
			}
			paramsType[k] = key
			req[key] = getType({
				key,
				list: Object.values(value).map((i: any) =>
					getTypeItemStr({
						key: i.name,
						type: getSingleType(i.type),
						required: i.required,
						desc: i.description?.trim()
					})
				),
				description: desc + ' ' + k + '请求参数'
			})
		}

		fnMap[i.operationId] = formatFnString({
			fnName: i.operationId,
			method: i.method,
			url: i.path,
			reqType: {},
			resType,
			desc: [
				i.tags.join('/'),
				i.name,
				i.description
			].join(' ')
		})
	})
	saveFn({
		fn: fnMap,
		dtoMap: {},
		config
	})
}

export function buildApi(swaggerJson: SwaggerJson, config: ApiBuilderConfig) {
	let dtoMap: any = {}
	const baseUrl = swaggerJson.basePath || swaggerJson.servers?.[0]?.url || ''
	console.log(`开始构建接口文档：${baseUrl}`)
	const schemaType = buildSchemaType(swaggerJson.definitions || swaggerJson.components?.schemas)
	const fnType = buildPathTypeAndFn(swaggerJson.paths, baseUrl, config.filter)

	dtoMap = {
		...fnType.dtoMap,
		...schemaType.dtoMap
	}
	Object.keys(dtoMap).forEach(key => {
		if (key.endsWith('[]') && key !== 'any[]') {
			const name = key.match(/[^\[\]]+/)?.[0]
			delete dtoMap[key]
			dtoMap[`${name}InList`] = `export type ${name}InList = ${key}`
		}
	})

	const importFnTypeList = saveFn({
		dtoMap,
		config,
		fn: fnType.fn
	})
	saveTyped({
		dtoMap,
		config,
		importFnTypeList,
		dtoValue: schemaType.dtoValue
	})
}

export function buildPathTypeAndFn(paths: SwaggerJson['paths'], basePath: SwaggerJson['basePath'], filter: ApiBuilderConfig['filter']): any {
	const dtoMap: any = {}
	const fn: any = {}

	for (const url in paths) {
		const item = paths[url]
		for (const method in item) {
			const sub = item[method as ReqMethod]
			if (filter) {
				const show = filter({
					url: (basePath === '/' ? '' : basePath) + url,
					method,
					...sub
				})
				if (!show) {
					continue
				}
			}
			const fnName = sub.operationId
			const desc = sub.tags.join(' ') + ' ' + sub.summary?.trim()
			let resType = sub.responses?.['200']?.type ? getSingleType(sub.responses?.['200'].type) : getRefType(sub.responses?.['200']?.schema?.$ref)

			// 处理请求参数
			const params: any = {}
			if (sub.parameters) {
				sub.parameters?.forEach(p => {
					if (p.in === 'body') {
						if (method === 'get') {
							return
						}
						if (method === 'delete') {
							console.warn(`⚠⚠⚠警告：${url} / delete方式请求中，不建议使用body传参`)
						}
					}
					if (p.schema?.$ref) {
						p.type = getRefType(p.schema.$ref)
					} else if (p.schema?.type) {
						const type = p.schema.type
						if (type === 'array') {
							let subType = p.schema.items?.type || 'any'
							subType = getRefType(subType)
							p.type = `${subType}[]`
						} else {
							p.type = getRefType(type)
						}
					}
					if (p.in) {
						if (!params[p.in]) {
							params[p.in] = {}
						}
						params[p.in][p.name] = p
					} else {
						//TODO 没有指定参数的位置：query/body/formBody/path/header/cookie
						console.log(method, url)
						console.log('参数未指定位置，下面对象中未包含in字段 in = query/body/formBody/path/header/cookie')
						console.log(p)
					}
				})
			}

			const { formData, ...otherParams } = params

			const paramsType: any = {}
			if (!fnName) {
				console.log('sub.operationId 是空的', sub)
			}
			if (formData) {
				const key = upperFirstCase(fnName) + 'FormData'
				dtoMap[key] = getFormType({
					key,
					list: Object.keys(formData)
				})
				paramsType.formData = key
			}
			for (const k in otherParams) {
				const value: any = otherParams[k]

				if (k === 'body') {
					// 单独处理body请求中的包装类
					const bodyJason: any = value[Object.keys(value)[0]]
					const isGroupType = bodyJason.schema?.type?.startsWith('#/definitions')
					const isGroupRef = bodyJason.schema?.$ref?.startsWith('#/definitions')
					const isGroupSingle = bodyJason.schema?.type && /array|object/i.test(bodyJason.schema?.type)
					if (isGroupType || isGroupRef || isGroupSingle) {
						paramsType[k] = bodyJason.type
						continue
					}
				}
				if (value.req) {
					paramsType[k] = value.req.type
					continue
				}
				const key = upperFirstCase(fnName) + upperFirstCase(k)
				if (typeMap[key] || key === 'any') {
					continue
				}
				paramsType[k] = key
				if (!/[a-z]/i.test(key)) {
					console.log(`接口${url}的数据类型中含有非字母字符，请优化 export interface ${key} {...}`)
				}
				dtoMap[key] = getType({
					key,
					list: Object.values(value).map((i: any) =>
						getTypeItemStr({
							key: i.name,
							type: getSingleType(i.type),
							required: i.required,
							desc: i.description?.trim()
						})
					),
					description: desc + ' ' + k + '请求参数'
				})
			}

			if (resType.endsWith('[]') && resType !== 'any[]') {
				const name = resType.match(/[^\[\]]+/)?.[0]
				resType = name + 'InList'
				dtoMap[resType] = `export type ${resType} = ${name}[]`
			}
			fn[fnName] = formatFnString({
				method,
				fnName,
				url: (basePath === '/' ? '' : basePath) + url,
				desc,
				reqType: paramsType,
				resType
			})
		}
	}

	return { dtoMap, fn }
}

export function buildSchemaType(definitions: SwaggerJson['definitions']) {
	const dtoValue: any = {}
	const dtoMap: any = {}

	// 处理公共数据模型
	Object.keys(definitions).forEach(i => {
		const item = definitions[i]
		if (/^R«/.test(i)) {
			// TODO 需要进行优化，适配任意场景
			return
		}
		const title = getRefType(i)
		for (const key in item.properties) {
			const paramsItem = item.properties[key]
			if (paramsItem.items) {
				const type = getSingleType(paramsItem.items?.type || '') || getRefType(paramsItem.items?.$ref || '')
				if (paramsItem.type === 'array') {
					if (type === 'array' || type === 'object') {
						paramsItem.type = 'any[]'
					} else {
						paramsItem.type = type + '[]'
					}
				} else {
					paramsItem.type = type || 'any'
				}
			}
			paramsItem.typeStr = getTypeItemStr({
				key,
				type: paramsItem.type ? getSingleType(paramsItem.type) : getRefType(paramsItem.$ref || ''),
				required: (item.required === undefined && title.endsWith('Resp')) || item.required?.includes(key) || false,
				desc: paramsItem.description?.trim() || ''
			})
		}
		if (typeMap[title] || title === 'any') {
			return
		}

		if (/^\{|}$/.test(title)) {
			return
		}
		if (!/[a-z]/i.test(title)) {
			console.log(`数据类型中含有非字母字符，请优化 export interface ${title} {...}`)
		}

		const typeStr = getType({
			key: title,
			list: Object.values(item.properties || []).map(i => i.typeStr),
			description: item.description?.trim() || ''
		})
		dtoMap[title] = typeStr

		if (title === 'R') {
			// TODO 需要进行优化，适配任意场景
			return
		}
		if (title.endsWith('[]') && title !== 'any[]') {
			return
		}
		dtoValue[title] = getTypeDefaultValue({
			key: title,
			list: Object.keys(item.properties || []).map(i => {
				return {
					name: i,
					...item.properties[i]
				}
			}),
			description: item.description?.trim() || ''
		})
	})
	return { dtoValue, dtoMap }
}


export function saveFn(props: { fn: any, dtoMap: any; config: ApiBuilderConfig }) {
	const { fn, dtoMap, config } = props
	const autoMkDir = config.output?.autoMkDir
	const apiDir = config.output?.api || './src/api'
	const space = config.namespace
	const dir = path.resolve('.', apiDir + (space ? '/' + space : ''))
	const url = path.resolve(dir, 'index.ts')

	mkdirSync(dir, { recursive: true })

	if (autoMkDir) {
		mkdirSync(apiDir, { recursive: true })
	}

	// 将 http.ts, http.typed.ts, http.utils.ts 复制到指定目录
	// TODO
	// if (!existsSync(path.resolve(apiDir, 'http.ts'))) {
	// 	copyFileSync(path.resolve(__dirname, 'common/http.js'), path.resolve(apiDir, 'http.ts'))
	// }
	// if (!existsSync(path.resolve(apiDir, 'http.typed.d.js'))) {
	// 	copyFileSync(path.resolve(__dirname, 'common/http.typed.d.js'), path.resolve(apiDir, 'http.typed.d.js'))
	// }
	// if (!existsSync(path.resolve(apiDir, 'http.utils.ts'))) {
	// 	copyFileSync(path.resolve(__dirname, 'common/http.utils.js'), path.resolve(apiDir, 'http.utils.js'))
	// }

	// 识别函数中引用的数据类型
	const importInFn: string[] = []

	const fnList: string[] = Object.values(fn)

	fnList.forEach((i: any) => {
		const resType = i.resType
		const reqType: string[] = Object.values(i.reqType) || []
		if (resType && !typeMap[resType] && dtoMap[resType] && !importInFn.includes(resType)) {
			importInFn.push(resType)
		}
		reqType.forEach(s => {
			if (s && !typeMap[s] && dtoMap[s] && !importInFn.includes(s)) {
				importInFn.push(s)
			}
		})
	})

	const ns = space ? '/' + space : ''
	let importType: string[] = []

	if (config.apiImports?.length) {
		importType.push(...config.apiImports)
	} else {
		importType.push(...[`import type { RequestOptionProps } from '@/api/http.typed'`, `import { post, get, del, put } from '@/api/http'`])
	}
	if (importInFn.length) {
		if (config.apiTypeImport) {
			const v = config.apiTypeImport.replace(/\{}/, `{${buildImportStr([...importInFn].sort())}}`)
			importType.push(v)
		} else {
			importType.push(`import type {${buildImportStr([...importInFn].sort())}} from '@/typed${ns}/dto.typed'`)
		}
	}
	let methods: string[] = []

	for (let i in fn) {
		const item = fn[i]
		if (item.fnBody) {
			const reg = /return (get|post|del|put|head|options|patch)<[^<>]+>\(/
			const result = item.fnBody.match(reg)
			if (result) {
				const method = result[1]
				if (!methods.includes(method)) {
					methods.push(method)
				}
			}
		}
	}

	methods = methods.sort()

	importType = importType.map(i => {
		const reg = /\{\s*(get|post|del|put|head|options|patch)(\s*,\s*(get|post|del|put|head|options|patch))*\s*\}/
		if (reg.test(i)) {
			i = i.replace(reg, '{ ' + methods.join(', ') + ' }')
		}

		return i
	})

	writeFileSync(
		url,
		`${importType.join(lineN) + lineN}${Object.values(fn).map((i: any) => i.fnBody).join('')}`,
		{ encoding: 'utf-8' }
	)

	return importInFn
}

export function buildImportStr(list: string[]): string {
	let str = list.length > 1 ? `,${lineN}\t` : ', '
	str = list.filter(i => i !== 'any').join(str)
	str = list.length > 1 ? `${lineN}\t${str}${lineN}` : ` ${str} `
	return str
}

export function saveTyped(props: { importFnTypeList: any[], dtoMap: any; dtoValue: any; config: ApiBuilderConfig }) {
	const { importFnTypeList, dtoMap, dtoValue, config } = props
	const space = config.namespace
	const autoMkDir = config.output?.autoMkDir
	const dir = path.resolve('.', (config.output?.typed || './src/typed') + (space ? '/' + space : ''))
	const otherUrl = path.resolve(dir, 'dto.typed.ts')
	const dtoValueUrl = path.resolve(dir, 'dto.value.ts')
	if (!existsSync(dir) && autoMkDir) {
		mkdirSync(dir, { recursive: true })
	}

	const needUseTypeList = [...importFnTypeList]

	importFnTypeList.forEach(i => {
		getTypeByDtoMap(dtoMap[i])
	})

	function getTypeByDtoMap(typeValue: string) {
		const result = typeValue.match(/[:=]\s*([a-z\d]+)\[?/gi)
		if (result) {
			result.forEach(i => {
				const type = i.match(/[:=]\s*([a-z\d]+)\[?/i)?.[1]
				if (!type || typeMap[type] || needUseTypeList.includes(type)) {
					return
				}
				if (dtoMap[type]) {
					needUseTypeList.push(type)
					getTypeByDtoMap(dtoMap[type])
				}
			})
		}
	}

	writeFileSync(
		otherUrl,
		needUseTypeList.map(i => dtoMap[i]).join(`${lineN}${lineN}`),
		{ encoding: 'utf-8' }
	)

	writeFileSync(
		dtoValueUrl,
		needUseTypeList.map(i => dtoValue[i]).filter(Boolean).join(`${lineN}${lineN}`),
		{ encoding: 'utf-8' }
	)
}

function getType({ key, list, type, description }: { key: string; type?: string; description?: string; list?: any[] }) {
	let desc = ''
	if (type) {
		if (description) {
			if (description.includes('\n')) {
				console.log(description)
				desc = description
				.split(/[\n\r]+/)
				.map(i => `// ${i}`)
				.join(lineN)
			} else {
				desc = ` // ${description}`
			}
		} else {
			desc = ''
		}
		return `${desc}export type ${key} = ${type};`
	}
	let valueList = list?.join(`${lineN}\t`)
	if (valueList) {
		valueList = `${lineN}\t${valueList}${lineN}`
	} else {
		valueList = lineN
	}
	return `${desc}export interface ${key} {${valueList}}`
}

export function getTypeDefaultValue({ key, list, type, description }: {
	key: string;
	type?: string;
	description?: string;
	list?: any[]
}) {
	if (type) {
		return `${description ? `// ${description}${lineN}` : ''}export const ${key}Value = ${valueMap[type]};`
	}
	const valueList = list?.map(i => {
		if (valueMap[i.type]) {
			return `${i.name}: ${valueMap[i.type]}`
		}
		if (i.type?.includes('[]')) {
			return `${i.name}: []`
		}
		return `${i.name}: {}`
	})
	return `${description ? `// ${description}${lineN}` : ''}export const ${key}Value = {${lineN}\t${valueList?.join(`,${lineN}\t`)}${lineN}}`
}

export function getFormType({ key, list }: { key: string; list: string[] }) {
	return `export interface ${key} extends FormData {
	append: (name: ${list.map(i => `'${i}'`).join(' | ')}, value: string | Blob, fileName?: string) => void;
}`
}

export function upperFirstCase(str: string) {
	return str?.replace(/^[a-z]/i, a => {
		return a.toUpperCase()
	})
}

function formatFnString(props: {
	method: string;
	fnName: string;
	url: string;
	desc: string;
	reqType: any;
	resType: string
}) {
	const { method, fnName, url, desc, reqType, resType } = props
	const reqList: string[] = []
	const reqListStr: string[] = []

	Object.keys(reqType).map(i => {
		reqList.push(` * @param {${reqType[i]}} params.${i}`)
		reqListStr.push(`${i}: ${reqType[i]}`)
	})

	const paramsStr = reqListStr.length ? `${lineN}\t\tparams` : ''
	let optStr = ''
	if (paramsStr) {
		optStr += `,${lineN}\t\t...opt`
	} else {
		optStr += `${lineN}\t\t...opt`
	}
	const totalStr = paramsStr || optStr ? `, {${paramsStr}${optStr}${lineN}\t}` : ''

	const paramsTypeStr = reqListStr.length
		? `params: {${reqListStr.length > 1 ? `${lineN}\t${reqListStr.join(`,${lineN}\t`)}${lineN}` : ` ${reqListStr[0]} `}}, opt?: RequestOptionProps`
		: 'opt?: RequestOptionProps'

	return {
		fnName,
		method,
		resType,
		reqType,
		fnBody: `
/**
 * @description ${desc}${reqList.length ? lineN + reqList.join(lineN) : ''}
 * @return Promise<${resType || 'any'}>
 */
export const ${fnName} = async (${paramsTypeStr}) => {
	return ${method === 'delete' ? 'del' : method}<${resType || 'any'}>('${url}'${totalStr})
}
`
	}
}

export function getTypeItemStr({ key, required, type, desc }: {
	key: string;
	required: boolean;
	type: string;
	desc: string
}): string {
	if (desc) {
		if (desc.includes('\n')) {
			desc =
				lineN +
				desc
				.split(/[\n\r]+/)
				.filter(i => i !== '')
				.map(i => `\t// ${i}`)
				.join(lineN)
		} else {
			desc = ` // ${desc}`
		}
	} else {
		desc = ''
	}
	return `${key}${required ? '' : '?'}: ${type};${desc}`
}


export const getApiAndBuildApiFox = async (config: ApiBuilderConfig) => {
	const projectId = config.swagger?.match(/project\/([^\/]+)$/)?.[1]
	if (!projectId) {
		console.log('未匹配到项目id，swagger地址格式应该是：', 'https://app.apifox.com/project/xxxxxxx')
		return
	}
	let apiList = await getSwaggerDoc({
		url: `https://api.apifox.com/api/v1/api-details?locale=zh-CN`,
		headers: {
			Authorization: 'Bearer ' + config.authToken,
			Referer: 'https://www.apifox.cn/',
			'x-project-id': projectId
		}
	})
	apiList = apiList.data

	if (config.filter) {
		apiList = apiList.filter(config.filter)
	}

	let schemasList = await getSwaggerDoc({
		url: `https://api.apifox.com/api/v1/projects/${projectId}/data-schemas?locale=zh-CN`,
		headers: {
			Authorization: 'Bearer ' + config.authToken,
			Referer: 'https://www.apifox.cn/',
			'x-project-id': projectId
		}
	})
	schemasList = schemasList.data

	buildApiFox(apiList, schemasList, config)
}

export const getApiAndBuild = async (domain: string, pathname: string, config: ApiBuilderConfig) => {
	if (pathname) {
		const url = domain + pathname
		// 读取接口文档
		const data = await getSwaggerDoc({
			url
		})

		if (data.error) {
			if (config.swagger?.includes('urls.primaryName')) {
				const newUrl = config.swagger?.replace(/(urls.primaryName=).*/, `$1${config.primaryName || ''}`)
				console.log(`接口文档服务报错：${config.namespace} ${newUrl}`)
			} else if (config.primaryNames?.length) {
				console.log(`接口文档服务报错：${config.namespace} ${url}`)
			} else {
				console.log(`接口文档服务报错：${config.swagger}`)
			}
			return
		}
		// 构建ts文件
		// console.log(`开始构建接口文档：接口数量${Object.keys(data.paths).length} `);
		buildApi(data, config)
	}
}

export function pingHost(url: string): Promise<boolean> {
	const urlObj = new URL(url)
	return new Promise(resolve => {
		// 根据系统选择命令
		const cmd = process.platform === 'win32' ? `ping -n 1 ${urlObj.hostname}` : `ping -c 1 ${urlObj.hostname}`

		exec(cmd, (error: any) => {
			if (error) {
				resolve(false) // 无法访问
			} else {
				resolve(true) // 可访问
			}
		})
	})
}

export async function installDependencies() {
	return new Promise((resolve) => {
		const rootPath = path.resolve(process.cwd())
		const lockFile = readdirSync(rootPath).find(i => i.includes('package-lock.json') || i.includes('yarn.lock') || i.includes('pnpm-lock.yaml'))
		if (lockFile) {
			console.log('安装最新版vite-plugin-api-builder...')
			const command = lockFile === 'yarn.lock' ? 'yarn' : lockFile === 'package-lock.json' ? 'npm install' : 'pnpm install'
			exec(command, (error, stdout, stderr) => {
				if (error) {
					console.error(`❌ 安装失败，请手动进行安装，以更新: vite-plugin-api-builder ${error}`)
				} else if (stderr) {
					console.error(`⚠️ 错误信息: ${stderr}`)
				} else {
					console.log(`✅ 执行结果:${lineN}${stdout}`)
				}

				resolve(true)
			})
		}
	})
}

export async function updatePackage() {
	const packPath = resolve(process.cwd(), 'package.json');
	if (!existsSync(packPath)) {
		console.log('未找到 package.json');
		return;
	}

	const fileContent = readFileSync(packPath, { encoding: 'utf-8' });
	const jsonFile = JSON.parse(fileContent);

	const pluginName = 'vite-plugin-api-builder';
	const currentDep = jsonFile.devDependencies?.[pluginName];

	// 如果没有安装该依赖，直接退出
	if (!currentDep) {
		console.log(`未安装 ${pluginName}，无需更新`);
		return;
	}
	// 自动判断使用 yarn 还是 npm
	const useYarn = existsSync(resolve(process.cwd(), 'yarn.lock'));
	const useNpm = existsSync(resolve(process.cwd(), 'package-lock.json'));

	let cmd: string;
	let args: string[];

	if (useYarn) {
		cmd = 'yarn';
		args = ['upgrade', pluginName];
		console.log('🚀 使用 yarn 升级依赖...');
	} else if (useNpm) {
		cmd = 'npm';
		args = ['install', `${pluginName}@latest`]; // 明确升级到最新版
		console.log('🚀 使用 npm 升级依赖...');
	} else {
		console.error('❌ 未检测到 yarn.lock 或 package-lock.json，无法确定包管理器。');
		return;
	}

	try {
		// 执行升级命令
		require('child_process').execSync(`${cmd} ${args.join(' ')}`, {
			stdio: 'inherit',
			cwd: process.cwd(),
		});

		console.log(`✅ 成功将 ${pluginName} 升级至最新版本`);
	} catch (error: any) {
		console.error(`❌ 升级失败: ${error.message}`);
	}
}
