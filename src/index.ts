import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path'
import type { ApiBuilderConfig } from './index.typed'
import { getApiAndBuild, getApiAndBuildApiFox, getDomain, getSwaggerDoc, pingHost, updatePackage } from './utils'

const vitePluginApiBuilder = async (config: ApiBuilderConfig) => {
	if (config.swagger) {
		if (config.useLock) {
			const lockPath = resolve(__dirname, 'api.lock')
			const hasLock = existsSync(lockPath)
			if (hasLock) {
				return
			}
			writeFileSync(lockPath, '', { encoding: 'utf-8' })
		}

		if (config.needUpdateVersion) {
			try {
				// 自动更新脚本
				await updatePackage()
			} catch (e) {
				console.error('项目自动更新失败')
				console.error(e)
			}
		}
		const pass = await pingHost(config.swagger)
		if (!pass) {
			console.log('无法访问接口文档，请检查网络连接', config.swagger)
			return
		}

		if (config.swagger?.includes('apifox')) {
			await getApiAndBuildApiFox(config)
		} else {
			// 读取配置信息
			console.log('读取swagger配置信息...');
			const domain = getDomain(config.swagger)
			let json = await getSwaggerDoc({
				url: domain + '/swagger-resources' // 尝试v2版本接口
			})

			if (json.status && json.status !== 200) {
				// 尝试v3版本接口
				///v3/api-docs/swagger-config
				const res = await getSwaggerDoc({
					url: domain + '/v3/api-docs/swagger-config' // 尝试v2版本接口
				})

				if (res.status && res.status !== 200){
					console.log('swagger接口文档获取失败', res)
					return
				}

				json = res.urls

				if (!json?.length) {
					console.log('swagger接口文档获取失败', res)
					return
				}
			}

			console.log('读取swagger接口文档...')
			if (!json) {
				console.log('swagger接口文档获取失败', json)
				return
			}
			const pnList = config.primaryNames || [{ namespace: config.primaryName, primaryName: config.primaryName}]
			for (let i = 0; i < pnList.length; i++) {
				const space = pnList[i]
				const chooseOne = json.find((item: any) => item.name === space.primaryName)
				await getApiAndBuild(domain, chooseOne.url, {
					...config,
					...space
				})
			}
			console.log('接口文档构建完成')
		}
	}
}

// 为了解决 CJS 和 ESM 的兼容性问题，我们需要同时提供默认导出和命名导出
export default vitePluginApiBuilder
// 不需要额外的命名导出，只使用默认导出
// export { vitePluginApiBuilder }
