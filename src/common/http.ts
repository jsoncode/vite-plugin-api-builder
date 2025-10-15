import { AjaxReturn, RequestOptionProps } from './http.typed'
import { clearNullData, formatCookie, listenEvent, mergeParams, setHeaders, setLoading } from './http.utils'

export const api_base = '/api' //import.meta.env.VITE_APP_PROXY_API_PREFIX

// 导出一个异步函数，用于发送HTTP请求
export async function http<T>(url: string, options: RequestOptionProps = {}): Promise<AjaxReturn<T>> {
    // 将url拼接上api_base
    url = api_base + url
    // 解构options中的参数
    const {
        method = 'POST',
        xhrAttribute = {},
        uploadProgress,
        downloadProgress,
        showLoading,
        showErrorMessage = true
    } = options
    let {headers = {}} = options

    // 解构params中的参数
    let optQuery = options.params?.query
    const optPath = options.params?.path
    const optBody = options.params?.body
    const optForm = options.params?.formData
    const headerInParams = options.params?.header
    const cookieInParams = options.params?.cookie
    // 如果有optPath，则将url中的占位符替换为optPath中的值
    if (optPath) {
        for (const key in optPath) {
            url = url.replace(new RegExp(`\\{${key}\\}`), optPath[key])
        }
    }
    // 如果有optQuery，则将url中的query参数替换为optQuery中的值
    if (optQuery) {
        optQuery = clearNullData(optQuery)
        url = mergeParams({
            url,
            query: optQuery
        })
    }
    let bodyStr = ''
    // 如果有optBody，则将optBody转换为JSON字符串，并设置请求头为application/json
    if (optBody && (method === 'POST' || method === 'PUT')) {
        bodyStr = JSON.stringify(clearNullData(optBody))
        headers = {
            ...headers,
            ...headerInParams,
            'Content-Type': 'application/json',
            ...(cookieInParams ? {cookie: formatCookie(cookieInParams)} : {})
        }
    } else {
        // 否则，将optBody转换为query参数，并拼接到url中
        url = mergeParams({
            url,
            query: clearNullData(optBody)
        })
    }

    return new Promise(resolve => {
        // 如果showLoading为true，则显示loading
        showLoading && setLoading('show')
        const xhr = new XMLHttpRequest()
        // 如果有responseType，则设置xhr的responseType
        if (options.responseType) {
            xhr.responseType = options.responseType
        }

        // 将xhrAttribute中的属性赋值给xhr
        Object.keys(xhrAttribute).forEach((i: string) => {
            (xhr as any)[i] = xhrAttribute[i]
        })

        // 打开请求
        xhr.open(method.toUpperCase(), url)
        // 设置请求头
        setHeaders(xhr, headers)
        // 监听xhr的各种事件
        listenEvent({
            xhr,
            url,
            uploadProgress,
            downloadProgress,
            showLoading,
            showErrorMessage,
            callback: data => resolve(data as AjaxReturn<T>)
        })
        // 发送请求
        xhr.send(optForm ? optForm : bodyStr ? bodyStr : '')
    })
}

// 导出一个异步函数，用于发送请求
export async function request<T>(url: string, options: RequestOptionProps = {}): Promise<AjaxReturn<T>> {
    // 设置请求头，包括token和用户自定义的请求头
    options.headers = {
        authorization: `Bearer ${localStorage.getItem('token')}`,
        tenantId: '',
        ...(options.headers || {})
    }
    // 发送请求
    return http<T>(url, options)
}

// 导出一个异步函数，用于发送POST请求
export async function post<T>(url: string, options: RequestOptionProps = {}): Promise<AjaxReturn<T>> {
    // 设置请求方法为POST
    options.method = 'POST'

    // 发送请求并返回结果
    return request<T>(url, options)
}

// 导出一个异步函数，用于发送GET请求
export async function get<T>(url: string, options: RequestOptionProps = {}): Promise<AjaxReturn<T>> {
    // 设置请求方法为GET
    options.method = 'GET'

    // 发送请求并返回结果
    return request<T>(url, options)
}

// 导出一个异步函数，用于发送DELETE请求
export async function del<T>(url: string, options: RequestOptionProps = {}): Promise<AjaxReturn<T>> {
    // 设置请求方法为DELETE
    options.method = 'DELETE'

    // 发送请求并返回结果
    return request<T>(url, options)
}

// 导出一个异步函数，用于发送PUT请求
export async function put<T>(url: string, options: RequestOptionProps = {}): Promise<AjaxReturn<T>> {
    // 设置请求方法为PUT
    options.method = 'PUT'

    // 发送请求并返回结果
    return request<T>(url, options)
}
