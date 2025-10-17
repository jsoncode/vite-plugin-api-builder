import * as https from "node:https";
import * as http from "node:http";

export interface ReqOptions {
    url: string
    headers?: { [key: string]: string }
}

export async function request(options: ReqOptions): Promise<any> {
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
