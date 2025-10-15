# vite-plugin-api-builder
一个vite插件，可以根据将swagger文档构建可用于生产的api文档和typescript类型文件

### 安装

```shell
npm i -D git+https://github.com/jsoncode/vite-plugin-api-builder.git
```
8. 调用插件
根目录新建api.plugin.ts文件，添加以下内容
```ts
import vitePluginApiBuilder from 'vite-plugin-api-builder'

vitePluginApiBuilder({
	useLock: false,
	primaryNames: [
		{
			namespace: 'xxx',
			primaryName: 'xxx',
		}
    ],
	swagger: 'http://xxx.com/webjars/swagger-ui/index.html?urls.primaryName=xxx',
	apiImports: [
		`import type { RequestOptionProps } from '@/api/http.typed'`,
		`import { post, get, put } from '@/api/http'`,
	]
})

```

9. 添加命令
在package.json中添加以下命令
```json
{
	"build:api": "tsx api.plugin.ts"
}
```

10. 运行
```bash
npm run build:api
```

会默认构建以下文件：
```text
src
    /api
        index.ts // 接口文件
        /[namespace]/
        	index.ts // 接口文件
    /typed
        dto.types.ts
        /[namespace]/
			dto.types.ts
```

api/index.ts

```ts
/**
 * @description 登录接口
 *
 * @param {LoginUsingPOSTBody} params.body
 * @return Promise<LoginResp>
 */
export const loginUsingPOST = async (params: { body: LoginUsingPOSTBody }) => {
	return post<LoginResp>('/api/login', {
		params,
		headers: {
			'Content-type': 'application/json'
		}
	})
}
```

typed/request.typed.ts

```ts
// 登录接口 body请求参数
export interface LoginResp {
	username: string; // 用户名
    password: string; // 登录密码
}
```
