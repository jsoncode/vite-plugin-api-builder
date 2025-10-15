import vitePluginApiBuilder from "src/index";

console.log(typeof vitePluginApiBuilder ==='function')

async function run() {
    // await vitePluginApiBuilder({
    //     authToken,
    //     useLock: false,
    //     swagger: 'http://139.196.18.98:9999/webjars/swagger-ui/index.html?urls.primaryName=mallapi',
    //     apiImports: [
    //         `import type { RequestOptionProps } from '@/api/http.typed'`,
    //         `import { post, get } from '@/api/http'`
    //     ]
    // })
    await vitePluginApiBuilder({
	    swagger: 'http://182.16.0.55:21009/doc.html',
	    apiImports: [
		    `import { post, get } from './http'`,
		    `import { RequestOptionProps } from './http.typed'`
	    ],
	    apiTypeImport:`import {} from '@/typed/dto.typed'`,
	    output:{
		    api: 'src/api',
		    typed: 'src/typed'
	    }
    })

}

// run()
