"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const utils_1 = require("./utils.cjs");
const vitePluginApiBuilder = async (config) => {
    if (config.swagger) {
        if (config.useLock) {
            const lockPath = (0, node_path_1.resolve)(__dirname, 'api.lock');
            const hasLock = (0, node_fs_1.existsSync)(lockPath);
            if (hasLock) {
                return;
            }
            (0, node_fs_1.writeFileSync)(lockPath, '', { encoding: 'utf-8' });
        }
        if (config.needUpdateVersion) {
            try {
                // 自动更新脚本
                await (0, utils_1.updatePackage)();
            }
            catch (e) {
                console.error('项目自动更新失败');
                console.error(e);
            }
        }
        const pass = await (0, utils_1.pingHost)(config.swagger);
        if (!pass) {
            console.log('无法访问接口文档，请检查网络连接', config.swagger);
            return;
        }
        if (config.swagger?.includes('apifox')) {
            await (0, utils_1.getApiAndBuildApiFox)(config);
        }
        else {
            // 读取配置信息
            console.log('读取swagger配置信息...');
            const domain = (0, utils_1.getDomain)(config.swagger);
            const json = await (0, utils_1.getSwaggerDoc)({
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
                await (0, utils_1.getApiAndBuild)(domain, chooseOne?.url, config);
            }
            else if (json.length > 1 && config.primaryNames?.length) {
                for (let i = 0; i < config.primaryNames.length; i++) {
                    const space = config.primaryNames[i];
                    const chooseOne = json.find((item) => item.name === space.primaryName);
                    await (0, utils_1.getApiAndBuild)(domain, chooseOne.url, {
                        ...config,
                        ...space
                    });
                }
            }
            console.log('接口文档构建完成');
        }
    }
};
exports.default = vitePluginApiBuilder;
