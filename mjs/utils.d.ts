import type { ApiBuilderConfig, ApiFoxDetail, ApiFoxSchema, ReqOptions, SwaggerJson } from './index.typed';
/**
 * 前后端基本类型的映射
 * @param type
 */
export declare const getSingleType: (type?: string) => string;
export declare const getReferenceType: (k: string) => string;
export declare const isReference: (key: string) => boolean;
/**
 * 从$ref的值中识别出类型
 * @param key
 */
export declare const getRefType: (key?: string) => string;
export declare const getRefTypeApiFox: (key: string | undefined, schemaList: ApiFoxSchema[]) => string;
export declare function getDomain(url: string): string;
export declare function getSwaggerDoc(options: ReqOptions): Promise<any>;
export declare function buildApiFox(apiList: ApiFoxDetail[], schemaList: ApiFoxSchema[], config: ApiBuilderConfig): void;
export declare function buildApi(swaggerJson: SwaggerJson, config: ApiBuilderConfig): void;
export declare function buildPathTypeAndFn(paths: SwaggerJson['paths'], basePath: SwaggerJson['basePath'], filter: ApiBuilderConfig['filter']): any;
export declare function buildSchemaType(definitions: SwaggerJson['definitions']): {
    dtoValue: any;
    dtoMap: any;
};
export declare function saveFn(props: {
    fn: any;
    dtoMap: any;
    config: ApiBuilderConfig;
}): string[];
export declare function buildImportStr(list: string[]): string;
export declare function saveTyped(props: {
    importFnTypeList: any[];
    dtoMap: any;
    dtoValue: any;
    config: ApiBuilderConfig;
}): void;
export declare function getTypeDefaultValue({ key, list, type, description }: {
    key: string;
    type?: string;
    description?: string;
    list?: any[];
}): string;
export declare function getFormType({ key, list }: {
    key: string;
    list: string[];
}): string;
export declare function upperFirstCase(str: string): string;
export declare function getTypeItemStr({ key, required, type, desc }: {
    key: string;
    required: boolean;
    type: string;
    desc: string;
}): string;
export declare const getApiAndBuildApiFox: (config: ApiBuilderConfig) => Promise<void>;
export declare const getApiAndBuild: (domain: string, pathname: string, config: ApiBuilderConfig) => Promise<void>;
export declare function pingHost(url: string): Promise<boolean>;
export declare function installDependencies(): Promise<unknown>;
export declare function updatePackage(): Promise<void>;
//# sourceMappingURL=utils.d.ts.map