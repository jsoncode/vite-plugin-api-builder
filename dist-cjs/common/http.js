"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.api_base = void 0;
exports.http = http;
exports.request = request;
exports.post = post;
exports.get = get;
exports.del = del;
exports.put = put;
const http_utils_1 = require("./http.utils");
exports.api_base = '/api'; //import.meta.env.VITE_APP_PROXY_API_PREFIX
// 导出一个异步函数，用于发送HTTP请求
async function http(url, options = {}) {
    // 将url拼接上api_base
    url = exports.api_base + url;
    // 解构options中的参数
    const { method = 'POST', xhrAttribute = {}, uploadProgress, downloadProgress, showLoading, showErrorMessage = true } = options;
    let { headers = {} } = options;
    // 解构params中的参数
    let optQuery = options.params?.query;
    const optPath = options.params?.path;
    const optBody = options.params?.body;
    const optForm = options.params?.formData;
    const headerInParams = options.params?.header;
    const cookieInParams = options.params?.cookie;
    // 如果有optPath，则将url中的占位符替换为optPath中的值
    if (optPath) {
        for (const key in optPath) {
            url = url.replace(new RegExp(`\\{${key}\\}`), optPath[key]);
        }
    }
    // 如果有optQuery，则将url中的query参数替换为optQuery中的值
    if (optQuery) {
        optQuery = (0, http_utils_1.clearNullData)(optQuery);
        url = (0, http_utils_1.mergeParams)({
            url,
            query: optQuery
        });
    }
    let bodyStr = '';
    // 如果有optBody，则将optBody转换为JSON字符串，并设置请求头为application/json
    if (optBody && (method === 'POST' || method === 'PUT')) {
        bodyStr = JSON.stringify((0, http_utils_1.clearNullData)(optBody));
        headers = {
            ...headers,
            ...headerInParams,
            'Content-Type': 'application/json',
            ...(cookieInParams ? { cookie: (0, http_utils_1.formatCookie)(cookieInParams) } : {})
        };
    }
    else {
        // 否则，将optBody转换为query参数，并拼接到url中
        url = (0, http_utils_1.mergeParams)({
            url,
            query: (0, http_utils_1.clearNullData)(optBody)
        });
    }
    return new Promise(resolve => {
        // 如果showLoading为true，则显示loading
        showLoading && (0, http_utils_1.setLoading)('show');
        const xhr = new XMLHttpRequest();
        // 如果有responseType，则设置xhr的responseType
        if (options.responseType) {
            xhr.responseType = options.responseType;
        }
        // 将xhrAttribute中的属性赋值给xhr
        Object.keys(xhrAttribute).forEach((i) => {
            xhr[i] = xhrAttribute[i];
        });
        // 打开请求
        xhr.open(method.toUpperCase(), url);
        // 设置请求头
        (0, http_utils_1.setHeaders)(xhr, headers);
        // 监听xhr的各种事件
        (0, http_utils_1.listenEvent)({
            xhr,
            url,
            uploadProgress,
            downloadProgress,
            showLoading,
            showErrorMessage,
            callback: data => resolve(data)
        });
        // 发送请求
        xhr.send(optForm ? optForm : bodyStr ? bodyStr : '');
    });
}
// 导出一个异步函数，用于发送请求
async function request(url, options = {}) {
    // 设置请求头，包括token和用户自定义的请求头
    options.headers = {
        authorization: `Bearer ${localStorage.getItem('token')}`,
        tenantId: '',
        ...(options.headers || {})
    };
    // 发送请求
    return http(url, options);
}
// 导出一个异步函数，用于发送POST请求
async function post(url, options = {}) {
    // 设置请求方法为POST
    options.method = 'POST';
    // 发送请求并返回结果
    return request(url, options);
}
// 导出一个异步函数，用于发送GET请求
async function get(url, options = {}) {
    // 设置请求方法为GET
    options.method = 'GET';
    // 发送请求并返回结果
    return request(url, options);
}
// 导出一个异步函数，用于发送DELETE请求
async function del(url, options = {}) {
    // 设置请求方法为DELETE
    options.method = 'DELETE';
    // 发送请求并返回结果
    return request(url, options);
}
// 导出一个异步函数，用于发送PUT请求
async function put(url, options = {}) {
    // 设置请求方法为PUT
    options.method = 'PUT';
    // 发送请求并返回结果
    return request(url, options);
}
