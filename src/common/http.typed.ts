export type ObjAny = { [key: string]: any }
export type LikeString = string | null
export type SingleType = string | number | boolean | undefined | null
export type MethodProps = 'GET' | 'POST' | 'PUT' | 'DELETE'
export type ResponseType = 'arraybuffer' | 'blob' | 'document' | 'json' | 'text'
export type UploadProgressFn = (loaded: number, total: number, completed: boolean) => void | undefined
export type DownloadProgressFn = (loaded: number, total: number, completed: boolean) => void | undefined
export type RequestOptionProps = {
    method?: MethodProps
    headers?: ObjAny
    params?: {
        path?: ObjAny
        body?: ObjAny
        query?: ObjAny
        header?: ObjAny
        cookie?: ObjAny
        formData?: FormData
    }
    xhrAttribute?: ObjAny
    uploadProgress?: UploadProgressFn
    downloadProgress?: DownloadProgressFn
    responseType?: ResponseType
    showLoading?: boolean
    showErrorMessage?: boolean
}
export type AjaxReturn<T> = {
    code?: number
    data: T
    msg?: LikeString
    message?: LikeString
    total?: number
    current?: number
    pages?: number
    size?: number
    ext?: ObjAny
}

export interface ListenEventProps<T = ObjAny | null> {
    xhr: XMLHttpRequest,
    url: string;
    callback: (data: AjaxReturn<T>) => void,
    uploadProgress?: UploadProgressFn,
    downloadProgress?: DownloadProgressFn,
    showLoading?: boolean,
    showErrorMessage?: boolean
}
export interface MergeParams {
	url: string
	query?: { [key: string]: string | number | boolean | null }
	newUrl?: string
}
