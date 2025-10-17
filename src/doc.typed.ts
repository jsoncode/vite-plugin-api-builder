// index.typed.ts

// ========== OpenAPI 3.0 Types ==========
import {getRequestMethod} from "@/doc";

export interface OpenAPI3Document {
    openapi: string;
    info: OpenAPIInfo;
    tags: OpenAPITag[];
    paths: Record<string, OpenAPI3PathItem>;
    components?: {
        schemas?: Record<string, OpenAPI3Schema>;
        securitySchemes?: Record<string, any>;
    };
}

export interface OpenAPI3PathItem {
    [method: string]: OpenAPI3Operation; // get, post, etc.
}

export interface OpenAPI3Operation {
    operationId?: string;
    requestBody?: OpenAPI3RequestBody;
    parameters?: OpenAPI3Parameter[];
    responses: Record<string, OpenAPI3Response>;
}

export interface OpenAPI3RequestBody {
    content?: Record<string, { schema?: OpenAPI3Schema }>;
    required?: boolean;
}

export interface OpenAPI3Parameter {
    name: string;
    in: 'path' | 'query' | 'header' | 'cookie';
    required?: boolean;
    schema?: OpenAPI3Schema;
}

export interface OpenAPI3Response {
    description?: string;
    content?: Record<string, { schema?: OpenAPI3Schema }>;
}

export type OpenAPI3Schema =
    | { type: 'string'; format?: string; enum?: string[] }
    | { type: 'number' | 'integer'; format?: string }
    | { type: 'boolean' }
    | { type: 'array'; items: OpenAPI3Schema }
    | { type: 'object'; properties?: Record<string, OpenAPI3Schema>; required?: string[] }
    | { $ref: string };

// ========== Swagger 2.0 Types ==========
export interface Swagger2Document {
    swagger: '2.0';
    info: OpenAPIInfo;
    tags: OpenAPITag[];
    paths: Record<string, Swagger2PathItem>;
    definitions?: Record<string, Swagger2Schema>;
}

export interface Swagger2PathItem {
    [method: string]: Swagger2Operation;
}

export interface Swagger2Operation {
    operationId?: string;
    parameters?: Swagger2Parameter[];
    responses: Record<string, Swagger2Response>;
}

export interface Swagger2Parameter {
    name: string;
    in: 'path' | 'query' | 'header' | 'body' | 'formData';
    required?: boolean;
    schema?: Swagger2Schema; // only for in: 'body'
    type?: string; // for non-body
    format?: string;
    items?: { type: string };
}

export interface Swagger2Response {
    description?: string;
    schema?: Swagger2Schema;
}

export type Swagger2Schema =
    | { type: 'string'; format?: string; enum?: string[] }
    | { type: 'number' | 'integer'; format?: string }
    | { type: 'boolean' }
    | { type: 'array'; items: Swagger2Schema }
    | { type: 'object'; properties?: Record<string, Swagger2Schema>; required?: string[] }
    | { $ref: string };

// ========== Internal Types ==========
export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';

export interface ParsedOperation {
    path: string;
    operationId: string;
    method: HttpMethod;
    tag: string;
    summary: string;
    res: any[];
    req: {
        query: any[];
        body: any[];
        header: any[];
        cookie: any[];
        formData: any[];
        path: any[];
    }
}

export interface OpenAPITag {
    name: string;
    description: string
}

export interface OpenAPIInfo {
    title: string;
    description: string;
    version: string
}

export type SwaggerDocument = OpenAPI3Document | Swagger2Document;
