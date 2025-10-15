import { AjaxReturn, RequestOptionProps } from './http.typed';
export declare const api_base = "/api";
export declare function http<T>(url: string, options?: RequestOptionProps): Promise<AjaxReturn<T>>;
export declare function request<T>(url: string, options?: RequestOptionProps): Promise<AjaxReturn<T>>;
export declare function post<T>(url: string, options?: RequestOptionProps): Promise<AjaxReturn<T>>;
export declare function get<T>(url: string, options?: RequestOptionProps): Promise<AjaxReturn<T>>;
export declare function del<T>(url: string, options?: RequestOptionProps): Promise<AjaxReturn<T>>;
export declare function put<T>(url: string, options?: RequestOptionProps): Promise<AjaxReturn<T>>;
//# sourceMappingURL=http.d.ts.map