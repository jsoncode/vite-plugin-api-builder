export const defaultNullData = [void 0, 'undefined', 'null', null, '']

// 提示错误用的方法，即使做任何修改，错误消息也已经返回给业务层面。
export const alertError = (msg) => {
	// 这里替换成你项目中的错误提示方式
	console.log(msg);
}

export const setLoading = (type) => {
	// 显示加载框
	console.log( type);
}

export function listenEvent(listenProps) {
	const {xhr, callback, uploadProgress, downloadProgress, showLoading, showErrorMessage} = listenProps
	// 上传进度回调
	if (uploadProgress) {
		xhr.upload.onprogress = (event) => {
			if (event.lengthComputable) {
				uploadProgress(event.loaded, event.total, event.total === event.loaded)
			}
		}
	}
	if (downloadProgress) {
		// 下载进度监听器
		xhr.onprogress = event => {
			if (event.lengthComputable) {
				downloadProgress(event.loaded, event.total, event.total === event.loaded)
			}
		}
	}

	xhr.onerror = async () => {
		const msg = xhr.status === 0 ? '网络断开，请检查网络是否正常' : '请求错误'

		showLoading && setLoading('close')
		showErrorMessage && alertError(msg)
		callback({data: null, code: xhr.status === 0 ? 0 : 500, msg})
	}
	xhr.onabort = () => {
		const msg = '请求已取消'
		showLoading && setLoading('close')
		callback({data: null, code: 0, msg})
	}
	xhr.upload.onabort = () => {
		const msg = '已取消上传'
		showLoading && setLoading('close')
		callback({data: null, code: 0, msg})
	}
	xhr.onload = async () => {
		showLoading && setLoading('close')
		try {
			const type = xhr.getResponseHeader('content-type')
			if (type?.includes('/json')) {
				if (xhr.response instanceof Blob) {
					const res = await blobToJson(xhr.response)
					callback({
						data: null,
						code: 500,
						msg: res.message
					})
				} else {
					// current?: number;
					// pages?: number;
					// size?: number;
					// total?: number;
					const {
						code,
						msg,
						message,
						data,
						total,
						current,
						pages,
						size
					} = JSON.parse(xhr.response)
					if (passCode(code)) {
						callback({
							data,
							code,
							msg: null,
							...(total ? {total, current, pages, size} : {})
						})
					} else {
						if (code === 401) {
							//todo 退出登录
						}
						callback({
							data: null,
							code,
							msg: msg || message
						})
					}
				}
			} else {
				callback({
					data: xhr.response,
					code: xhr.status,
					msg: xhr.statusText,
					ext: {
						xhr,
						filename: xhr.getResponseHeader('content-disposition')
					}
				})
			}
		} catch (e) {
			const msg = (xhr.status >= 200 && xhr.status < 300 ? '数据格式错误' : xhr.statusText) + `【错误码 ${xhr.status}】`
			if (xhr.status === 401) {
				// todo 退出登录
			} else {
				alertError(msg)
			}
			if (showLoading) {
				setLoading('close')
			}
			callback({
				data: null,
				code: xhr.status,
				msg,
				ext: {
					xhr
				}
			})
		}
	}
}

// 遍历对象中的每个属性，并执行回调函数
export function forEachObj(obj, callback) {
	// 遍历对象中的每个属性
	for (const key in obj) {
		// 执行回调函数，传入属性值和属性名
		callback(obj[key], key)
	}
}

// 导出一个函数，用于设置XMLHttpRequest的请求头
export function setHeaders(xhr, headers) {
	// 遍历headers对象
	forEachObj(headers, (_value, key) => {
		// 如果headers[key]不为null和undefined
		if (headers[key] !== null && headers[key] !== undefined) {
			// 设置请求头
			xhr.setRequestHeader(key, headers[key].toString())
		}
	})
}

// 导出一个函数，用于清除params中的空数据
export function clearNullData(params, clearList = [undefined, 'undefined', 'null', '', null]) {
	// 如果params是FormData类型，则直接返回
	if (params instanceof FormData) {
		return params
	}
	// 定义一个空对象
	let obj = {}

	// 如果params是对象且不是数组，则遍历params
	if (params && typeof params === 'object' && !Array.isArray(params)) {
		for (const i in params) {
			// 获取params中的值
			let val = params[i]
			// 如果值是字符串，则去除首尾空格
			if (typeof val === 'string') {
				val = val.trim()
			}
			// 如果值不在clearList中，则将值添加到obj中
			if (!clearList.includes(val)) {
				obj[i] = val
			}
		}
	} else {
		// 否则，直接将params赋值给obj
		obj = params
	}

	// 返回obj
	return obj
}

export function queryToString(query) {
	const queryList = []

	if (!query || Object.keys(query).length === 0) {
		return ''
	}

	Object.keys(query)
	.sort()
	.map(i => {
		// 将参数添加到queryList数组中
		const value = query[i]
		if (defaultNullData.includes(value) || value === undefined || value === null) {
			return
		}
		queryList.push(`${i}=${encodeURIComponent(value?.toString())}`)
	})

	return queryList.length ? queryList.join('&') : ''
}

// 导出一个函数，用于合并参数
export function mergeParams(params) {
	// 定义一个query对象，用于存储合并后的参数
	const query = {
		// 如果params.newUrl存在，则获取newUrl的参数
		...(params.newUrl ? getSearchParams(params.newUrl) : {}),
		// 如果params.url存在，则获取url的参数
		...(params.url ? getSearchParams(params.url) : {}),
		// 如果params.query存在，则获取query的参数
		...(params.query || {}),
	}

	// 获取url
	const url = params.url.match(/^[^#?&]+/)?.[0]
	if (url) {
		const queryStr = queryToString(query)
		if (queryStr) {
			return url + '?' + queryStr
		} else {
			// 否则返回url
			return url
		}
	} else {
		// 如果url不存在，则返回params.url
		return params.url
	}
}

/**
 * 获取搜索参数
 * @param url 地址 可选
 * @param type {search|hash|url} 可选参数。匹配模式：search 只匹配search部分参数；hash只匹配hash中的参数；url 匹配url中所有参数
 */
export function getSearchParams(url, type = 'search') {
	// 定义一个空字符串，用于存储查询字符串
	let queryString = ''
	// 如果传入了url参数
	if (url) {
		// 如果type为search，则匹配search部分参数
		if (type === 'search') {
			queryString = url.match(/^[^#]+?\?([^?#/]+)/)?.[1] || ''
			// 如果type为hash，则匹配hash中的参数
		} else if (type === 'hash') {
			queryString = url.split('#')?.[1] || ''
			// 如果type为url，则匹配url中所有参数
		} else {
			queryString = url
		}
		// 如果没有传入url参数
	} else {
		// 根据type参数，获取对应的查询字符串
		queryString = type === 'search' ? location.search : type === 'hash' ? location.hash : location.href
	}
	// 如果查询字符串为空，则返回空对象
	if (!queryString) {
		return {}
	}
	// 如果type为url，并且查询字符串中同时包含#和?，并且#和?之间有参数，则将查询字符串拆分为search和hash两部分
	if (type === 'url' && queryString.includes('#') && queryString.includes('?') && /\?[^#]+?#/.test(queryString)) {
		const list = queryString.split(/[#?]/)
		const [_, search, hashPath, hashQuery] = list
		return {
			search: getSearchParams(search),
			hash: {
				...getSearchParams(hashPath),
				...getSearchParams(hashQuery)
			}
		}
	}
	// 定义一个正则表达式，用于匹配查询字符串中的参数
	const regStr = '([^=&?#\\/]+)=([^&?#\\/]*)'
	// 使用正则表达式匹配查询字符串中的参数
	const list = queryString.match(new RegExp(regStr, 'g'))
	// 定义一个空对象，用于存储查询参数
	const query = {}
	// 如果匹配到了参数
	if (list) {
		// 遍历参数列表
		list.forEach(i => {
			// 使用正则表达式匹配参数名和参数值
			const [_, key, value] = i.match(new RegExp(regStr))
			// 如果参数值不为undefined
			if (value !== 'undefined') {
				// 对参数值进行解码
				query[key] = decodeURIComponent(value)
				// 尝试将参数值转换为数字或对象
				try {
					if (typeof query[key] === 'string' && query[key].length > 10 && /^\d+(\.\d+)?$/.test(query[key])) {
						query[key] = Number(query[key]) > Number.MAX_SAFE_INTEGER ? query[key] : Number(query[key])
					} else {
						query[key] = JSON.parse(query[key])
					}
					// 如果转换失败，则将参数值转换为字符串
				} catch (e) {
					query[key] = query[key]?.split('+').join(' ')
				}
			}
		})
	}
	// 返回查询参数
	return query
}

export async function blobToJson(blob) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => {
			try {
				const jsonObject = JSON.parse(reader.result)
				resolve(jsonObject)
			} catch (error) {
				reject(error)
			}
		}
		reader.onerror = () => reject(reader.error)
		reader.readAsText(blob)
	})
}

// 导出一个函数，用于判断传入的code是否为0
export function passCode(code) {
	// 判断传入的code是否为0
	return code === 0
}

export function formatCookie(cookieMap) {
	const cookie = []
	for (const key in cookieMap) {
		cookie.push(`${key}=${cookieMap[key]}`)
	}
	return cookie.join('; ')
}
