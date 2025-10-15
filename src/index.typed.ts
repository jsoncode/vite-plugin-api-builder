export type ReqMethod = 'post' | 'get' | 'delete' | 'put' | 'update'

export interface Dto {
    type: string
    properties: { [key: string]: BeforePropertiesItem }
    description?: string
    required?: string[]
    title?: string
}

export interface FunctionProps {
    tags: string[]
    operationId: string
    summary: string
    consumes: string[]
    produces: string[]
    parameters: SwaggerReqParameters[]
    responses: {
        [Key in 200]: SwaggerResponses
    }
    deprecated: boolean
}

export interface SwaggerJson {
    definitions: {
        [key: string]: Dto
    }
    components: {
        schemas: {
            [key: string]: Dto
        }
    }
    basePath: string
    paths: {
        [path: string]: {
            [Key in ReqMethod]: FunctionProps
        }
    }
}

export interface PrimaryNamesProps {
    namespace: string;
    primaryName: string;
}

export interface FilterProps extends FunctionProps {
    url: string
    method: string;
}

export interface ApiBuilderConfig {
	needUpdateVersion?: boolean;
    authToken?: string;
    version?: 2 | 3
    primaryNames?: PrimaryNamesProps[]
    swagger?: string
    namespace?: string
    primaryName?: string
    apiImports?: string[]
    apiTypeImport?: string
    useLock?: boolean
    prefix?: string
    outType?: 'ts' | 'js' | 'typescript' | 'javascript'
    apiFox?: {
        token: string
        projectId: string
    }
    output?: {
        useTypeScript?: boolean
        api: string
        typed: string
    }
    importConfig?: {}
    filter?: (item: FilterProps) => boolean
}

export interface ReqOptions {
    url: string
    headers?: { [key: string]: string }
}

export interface SwaggerReqParameters {
    in: 'body' | 'query' | 'formData' | 'path' | 'header' | 'cookie'
    name: string
    description: string
    required: boolean
    type?: string
    typeStr?: string
    $ref?: string
    schema?: {
        $ref: string
        type: string
        items: {
            type: string
        }
    }
}

export interface SwaggerResponses {
    type?: string
    description: string
    schema?: {
        $ref: string
    }
}

export interface BeforePropertiesItem {
    $ref?: string
    type?: string
    required?: boolean
    description?: string
    example?: any
    items?: {
        type: string
        $ref: string
    }
    typeStr?: string
}

export interface AfterPropertiesItem {
    name: string
    type: string
    required: boolean
    description: string
}

export interface AfterDto {
    name: string
    description: string
    properties: { [key: string]: AfterPropertiesItem }
}

export interface AfterFunctionDto {
    name: string
    description: string
    responses: AfterDto
}

export interface ApiFoxDetailRequestBody {
    type: string
    parameters: any[]
    oasExtensions: string
}

export interface ApiFoxDetailResponses {
    id: number | string
    name: string
    code: number
    contentType: string
    jsonSchema: {
        type?: string
        $ref?: string
    }
    defaultEnable: boolean
    ordering: number
    description: string
    mediaType: string
    headers: any[]
}

export interface ApiFoxDetailParameters {
    path: any[]
    query: any[]
    cookie: any[]
    header: any[]
}

export interface ApiFoxDetail {
    id: number | string
    name: string
    type: string
    serverId: string
    preProcessors: any[]
    postProcessors: any[]
    inheritPreProcessors: any
    inheritPostProcessors: any
    description: string
    operationId: string
    sourceUrl: string
    method: ReqMethod
    path: string
    tags: string[]
    status: string
    requestBody: ApiFoxDetailRequestBody
    parameters: ApiFoxDetailParameters
    commonParameters: any
    auth: any
    responses: ApiFoxDetailResponses[]
    responseExamples: any[]
    codeSamples: any[]
    projectId: number
    folderId: number
    ordering: number
    responsibleId: number
    commonResponseStatus: any
    advancedSettings: {
        disabledSystemHeaders: any
    }
    customApiFields: any
    oasExtensions: any
    mockScript: any
    createdAt: string
    updatedAt: string
    creatorId: number
    editorId: number
    responseChildren: string[]
    visibility: number
    securityScheme: any
}

export interface ApiFoxSchemaJasonSchema {
    type: string
    required: string[]
    properties: {
        activityCode: {
            type: string
            description: string
        }
        status: {
            type: string
            format: string
        }
    }
    title: string
}

export interface ApiFoxSchema {
    id: number | string
    name: string
    displayName: string
    jsonSchema: ApiFoxSchemaJasonSchema
    folderId: number
    description: string
    projectId: number
    ordering: number
    creatorId: number
    editorId: number
    createdAt: string
    updatedAt: string
    visibility: string
}
