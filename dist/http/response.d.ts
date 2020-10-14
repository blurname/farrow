import type { Middleware } from '../core/pipeline';
import { ResponseInfo, json, html, text, raw, redirect, stream, file, vary, cookie, cookies, header, headers, status, buffer, empty, attachment, custom, BodyMap } from './responseInfo';
declare type ResponseInfoCreator = (...args: any) => ResponseInfo;
declare type ToResponse<T extends ResponseInfoCreator> = (...args: Parameters<T>) => Response;
export declare type Response = {
    info: ResponseInfo;
    merge: (...responsers: Response[]) => Response;
    json: ToResponse<typeof json>;
    html: ToResponse<typeof html>;
    text: ToResponse<typeof text>;
    raw: ToResponse<typeof raw>;
    redirect: ToResponse<typeof redirect>;
    stream: ToResponse<typeof stream>;
    file: ToResponse<typeof file>;
    vary: ToResponse<typeof vary>;
    cookie: ToResponse<typeof cookie>;
    cookies: ToResponse<typeof cookies>;
    header: ToResponse<typeof header>;
    headers: ToResponse<typeof headers>;
    status: ToResponse<typeof status>;
    buffer: ToResponse<typeof buffer>;
    empty: ToResponse<typeof empty>;
    attachment: ToResponse<typeof attachment>;
    custom: ToResponse<typeof custom>;
};
export declare const toResponse: <T extends ResponseInfoCreator>(f: T, info: ResponseInfo) => ToResponse<T>;
export declare const createResponse: (info: ResponseInfo) => Response;
export declare const Response: Response;
export declare type MaybeAsyncResponse = Response | Promise<Response>;
export declare const match: <T extends "json" | "text" | "html" | "empty" | "redirect" | "stream" | "buffer" | "file" | "raw" | "custom">(type: T, f: (body: BodyMap[T]) => MaybeAsyncResponse) => Middleware<any, MaybeAsyncResponse>;
export {};
