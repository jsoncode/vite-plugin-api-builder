import type {
    HttpMethod,
    OpenAPI3Document,
    OpenAPI3Schema,
    OpenAPITag,
    ParsedOperation,
    Swagger2Document,
    Swagger2Schema,
    SwaggerDocument,
} from './doc.typed';
import type {ApiBuilderConfig} from "./index.typed";
import {request} from "./request";

// 判断是否为 OpenAPI 3.0
export function isOpenAPI3(doc: any): doc is OpenAPI3Document {
    return typeof doc.openapi === 'string' && doc.openapi.startsWith('3.');
}

// 判断是否为 Swagger 2.0
export function isSwagger2(doc: any): doc is Swagger2Document {
    return doc.swagger === '2.0';
}

// 从 $ref 提取类型名，如 "#/components/schemas/User" → "User"
export function extractTypeName(ref: string): string {
    const parts = ref.split('/');
    return parts[parts.length - 1] || 'Unknown';
}

// 转换 operationId 为合法函数名（驼峰）
export function toCamelCase(str: string): string {
    return str
        // 替换非字母数字字符,并将后面一位转成大写
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
        // 将开头的字母转小写
        .replace(/^[A-Z]/, (c) => c.toLowerCase());
}

// 生成 TypeScript 类型名（首字母大写）
export function toPascalCase(operationId: string, suffix: string): string {
    const base = operationId
        .replace(/[^a-zA-Z0-9]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
    return base + suffix;
}

// 映射 HTTP 方法到请求函数名
export function getRequestMethod(method: HttpMethod): string {
    if (method === 'delete') return 'del';
    return method;
}

// 解析 OpenAPI 3.0 的 schema 引用或内联
function resolveSchemaV3(schema: OpenAPI3Schema | undefined): any {
    if (!schema) return null;
    if ('$ref' in schema) return schema;
    return schema;
}

// 解析 Swagger 2.0 的 schema
function resolveSchemaV2(schema: Swagger2Schema | undefined): any {
    if (!schema) return null;
    if ('$ref' in schema) return schema;
    return schema;
}

// 主解析函数
export function parseOperations(doc: SwaggerDocument): ParsedOperation[] {
    const operations: ParsedOperation[] = [];

    if (isOpenAPI3(doc)) {
        const {paths} = doc;
        for (const [path, pathItem] of Object.entries(paths)) {
            for (const [method, op] of Object.entries(pathItem as Record<string, any>)) {
                if (!op.operationId) continue;
                const item: any = {
                    path,
                    operationId: op.operationId,
                    method: getRequestMethod(method as HttpMethod),
                    tag: (op.tags && op.tags[0]) || 'default',
                    summary: op.summary,
                    req: {
                        query: [],
                        body: [],
                        header: [],
                        cookie: [],
                        formData: [],
                        path: [],
                    },
                    res: [{
                        ...op.responses['200']?.['content']?.['*/*']?.['schema']
                    }]
                }
                op.parameters?.forEach((param: any) => {
                    if (param.in === 'path') {
                        item.req.path.push(param)
                    } else if (param.in === 'query') {
                        item.req.query.push(param)
                    } else if (param.in === 'header') {
                        item.req.header.push(param)
                    } else if (param.in === 'cookie') {
                        item.req.cookie.push(param)
                    } else if (param.in === 'formData') {
                        item.req.formData.push(param)
                    }
                })
                if (op.requestBody?.content) {
                    item.req.body = []
                    for (let mime in op.requestBody.content) {
                        item.req.body.push({
                            in: 'body',
                            contentType: mime,
                            requestBody: true,
                            schema: op.requestBody.content[mime]
                        })
                    }
                }

                operations.push(item);
            }
        }
    } else if (isSwagger2(doc)) {
        const {paths} = doc;
        for (const [path, pathItem] of Object.entries(paths)) {
            for (const [method, op] of Object.entries(pathItem as Record<string, any>)) {
                if (!op.operationId) continue;
                const item: any = {
                    path,
                    operationId: op.operationId,
                    method: getRequestMethod(method as HttpMethod),
                    tag: (op.tags && op.tags[0]) || 'default',
                    summary: op.summary,
                    req: {
                        query: [],
                        body: [],
                        header: [],
                        cookie: [],
                        formData: [],
                        path: [],
                    },
                    res: [{
                        ...op.responses['200']?.['schema']
                    }]
                }

                const httpMethod = method.toLowerCase() as HttpMethod;

                const pathParams: string[] = [];
                let bodySchema = null;

                for (const param of op.parameters || []) {
                    if (param.in === 'path') {
                        pathParams.push(param.name);
                    } else if (param.in === 'body' && param.schema) {
                        bodySchema = resolveSchemaV2(param.schema);
                    }
                }

                // response
                let responseSchema = null;
                const successResp = op.responses['200'] || op.responses['201'] || Object.values(op.responses)[0];
                if (successResp?.schema) {
                    responseSchema = resolveSchemaV2(successResp.schema);
                }

                operations.push({
                    operationId: op.operationId,
                    path,
                    method: httpMethod,
                    hasBody: !!bodySchema,
                    hasPathParams: pathParams.length > 0,
                    bodySchema,
                    pathParams,
                    responseSchema,
                });
            }
        }
    }

    return operations;
}


// 生成单个函数代码
function generateFunctionCode(op: ParsedOperation): string {
    const funcName = toCamelCase(op.operationId);
    const bodyType = op.hasBody ? toPascalCase(op.operationId, 'Body') : 'never';
    const pathType = op.hasPathParams ? toPascalCase(op.operationId, 'Path') : 'never';
    const resType = op.responseSchema ? toPascalCase(op.operationId, 'Response') : 'any';

    const paramsType = `{ ${op.hasBody ? `body: ${bodyType}` : ''}${op.hasBody && op.hasPathParams ? ', ' : ''}${op.hasPathParams ? `path: ${pathType}` : ''} }`;

    const requestMethod = getRequestMethod(op.method);

    return `
export const ${funcName} = async (params: ${paramsType}, opt?: any) => {
  return ${requestMethod}<${resType}>('${op.path}', {
    params,
    ...opt
  });
}`;
}

// 生成类型定义（schema → TS interface）
function generateSchemaType(name: string, schema: any): string {
    if (!schema || !('$ref' in schema) && !('type' in schema)) {
        return `export type ${name} = any;`;
    }

    if ('$ref' in schema) {
        const typeName = extractTypeName(schema.$ref);
        return `export type ${name} = ${typeName};`;
    }

    if (schema.type === 'object') {
        const props = schema.properties || {};
        const required = new Set(schema.required || []);
        const fields = Object.entries(props).map(([key, val]) => {
            const propSchema = val as any;
            let tsType = 'any';
            if ('$ref' in propSchema) {
                tsType = extractTypeName(propSchema.$ref);
            } else if (propSchema.type === 'array') {
                const items = propSchema.items;
                if (items && '$ref' in items) {
                    tsType = `${extractTypeName(items.$ref)}[]`;
                } else if (items?.type) {
                    tsType = `${items.type}[]`;
                } else {
                    tsType = 'any[]';
                }
            } else if (propSchema.type === 'string') {
                tsType = propSchema.enum ? propSchema.enum.map((v: string) => `'${v}'`).join(' | ') : 'string';
            } else if (propSchema.type === 'integer' || propSchema.type === 'number') {
                tsType = 'number';
            } else if (propSchema.type === 'boolean') {
                tsType = 'boolean';
            }
            const optional = required.has(key) ? '' : '?';
            return `  ${key}${optional}: ${tsType};`;
        });
        return `export interface ${name} {\n${fields.join('\n')}\n}`;
    }

    if (schema.type === 'array') {
        if (schema.items && '$ref' in schema.items) {
            return `export type ${name} = ${extractTypeName(schema.items.$ref)}[];`;
        } else if (schema.items?.type) {
            return `export type ${name} = ${schema.items.type}[];`;
        }
        return `export type ${name} = any[];`;
    }

    if (schema.type === 'string') {
        if (schema.enum) {
            const values = schema.enum.map((v: string) => `'${v}'`).join(' | ');
            return `export type ${name} = ${values};`;
        }
        return `export type ${name} = string;`;
    }

    if (schema.type === 'number' || schema.type === 'integer') {
        return `export type ${name} = number;`;
    }

    if (schema.type === 'boolean') {
        return `export type ${name} = boolean;`;
    }

    return `export type ${name} = any;`;
}

// 主函数：从 JSON 文件生成代码
export function generateCodeFromSwagger(doc: SwaggerDocument, config: ApiBuilderConfig): string {
    const operations = parseOperations(doc);
    console.log(operations[0]);
    return
    // 生成函数列表
    const funcCodes = operations.map(generateFunctionCode).join('\n');

    // 生成类型定义
    const typeDefs = new Set<string>();
    operations.forEach(op => {
        if (op.bodySchema) {
            const typeName = toPascalCase(op.operationId, 'Body');
            typeDefs.add(generateSchemaType(typeName, op.bodySchema));
        }
        if (op.hasPathParams) {
            const typeName = toPascalCase(op.operationId, 'Path');
            const pathProps = op.pathParams.map(p => `  ${p}: string;`).join('\n');
            typeDefs.add(`export interface ${typeName} {\n${pathProps}\n}`);
        }
        if (op.responseSchema) {
            const typeName = toPascalCase(op.operationId, 'Response');
            typeDefs.add(generateSchemaType(typeName, op.responseSchema));
        }
    });

    const fullCode = `
// Auto-generated by swagger-to-ts
// DO NOT EDIT MANUALLY

${Array.from(typeDefs).join('\n\n')}

${funcCodes}
`;

    return fullCode
}

export function getDocGroup(doc: SwaggerDocument): Record<string, OpenAPITag> {
    const group: any = {}
    doc.tags.forEach(tag => {
        group[tag.description] = tag
    })

    return group
}

export async function getApiAndBuild(url: string, config: ApiBuilderConfig) {
    // 读取接口文档
    const data = await request({url})

    if (data.error) {
        if (config.swagger?.includes('urls.primaryName')) {
            const newUrl = config.swagger?.replace(/(urls.primaryName=).*/, `$1${config.primaryName || ''}`)
            console.log(`接口文档服务报错：${config.namespace} ${newUrl}`)
        } else if (config.primaryNames?.length) {
            console.log(`接口文档服务报错：${config.namespace} ${url}`)
        } else {
            console.log(`接口文档服务报错：${config.swagger}`)
        }
        return
    }
    if (data.info) {
        console.log(`${data.info.title} ${data.info.version} ${data.info.description}`);
    }
    generateCodeFromSwagger(data, config)
}
