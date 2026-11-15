export declare const memory: { readonly buffer: ArrayBuffer };
export declare function alloc(len: number): number;
export declare function dealloc(ptr: number, len: number): void;
export declare function call_ptr(ptr: number, len: number): number;
export declare function call_len(): number;
