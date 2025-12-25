declare module 'dom-to-image-more' {
    export function toPng(node: Node, options?: any): Promise<string>;
    export function toJpeg(node: Node, options?: any): Promise<string>;
    export function toBlob(node: Node, options?: any): Promise<Blob>;
    export function toPixelData(node: Node, options?: any): Promise<Uint8ClampedArray>;
    export function toSvg(node: Node, options?: any): Promise<string>;
}
