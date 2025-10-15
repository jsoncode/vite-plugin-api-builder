import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getApiAndBuild, getApiAndBuildApiFox, getDomain, getSwaggerDoc, pingHost, updatePackage } from './utils';
const vitePluginApiBuilder = async (config) => {
    if (config.swagger) {
        if (config.useLock) {
            const lockPath = resolve(__dirname, 'api.lock');
            const hasLock = existsSync(lockPath);
            if (hasLock) {
                return;
            }
            writeFileSync(lockPath, '', { encoding: 'utf-8' });
        }
        if (config.needUpdateVersion) {
            try {
                // 自动更新脚本
                await updatePackage();
            }
            catch (e) {
                console.error('项目自动更新失败');
                console.error(e);
            }
        }
        const pass = await pingHost(config.swagger);
        if (!pass) {
            console.log('无法访问接口文档，请检查网络连接', config.swagger);
            return;
        }
        if (config.swagger?.includes('apifox')) {
            await getApiAndBuildApiFox(config);
        }
        else {
            // 读取配置信息
            console.log('读取swagger配置信息...');
            const domain = getDomain(config.swagger);
            const json = await getSwaggerDoc({
                url: domain + '/swagger-resources'
            });
            if (json.status && json.status !== 200) {
                console.log('swagger接口文档获取失败', json);
                return;
            }
            console.log('读取swagger接口文档...');
            if (!json) {
                console.log('swagger接口文档获取失败', json);
                return;
            }
            if (json.length === 1) {
                const chooseOne = json[0];
                await getApiAndBuild(domain, chooseOne?.url, config);
            }
            else if (json.length > 1 && config.primaryNames?.length) {
                for (let i = 0; i < config.primaryNames.length; i++) {
                    const space = config.primaryNames[i];
                    const chooseOne = json.find((item) => item.name === space.primaryName);
                    await getApiAndBuild(domain, chooseOne.url, {
                        ...config,
                        ...space
                    });
                }
            }
            console.log('接口文档构建完成');
        }
    }
};
export default vitePluginApiBuilder;
