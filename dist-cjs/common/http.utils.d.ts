import { ListenEventProps, ObjAny, MergeParams, type SingleType } from './http.typed';
export declare const defaultNullData: SingleType[];
export declare const alertError: (msg: string) => void;
export declare const setLoading: (type: "show" | "close") => void;
export declare function listenEvent(listenProps: ListenEventProps): void;
export declare function forEachObj(obj: ObjAny, callback: (value: any, key: string) => void): void;
export declare function setHeaders(xhr: XMLHttpRequest, headers: ObjAny): void;
export declare function clearNullData(params: any, clearList?: any[]): any;
export declare function queryToString(query: MergeParams['query']): string;
export declare function mergeParams(params: MergeParams): string;
/**
 * 获取搜索参数
 * @param url 地址 可选
 * @param type {search|hash|url} 可选参数。匹配模式：search 只匹配search部分参数；hash只匹配hash中的参数；url 匹配url中所有参数
 */
export declare function getSearchParams(url?: string, type?: 'search' | 'hash' | 'url'): {
    [key: string]: any;
};
export declare function blobToJson(blob: Blob): Promise<any>;
export declare function passCode(code?: number): code is 0;
export declare function formatCookie(cookieMap: ObjAny): string;
//# sourceMappingURL=http.utils.d.ts.map