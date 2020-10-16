// sass imports
declare module "*.scss" {
  const styles: { [key: string]: string };
  export default styles;
}

declare const __webpack_hash__: string;

declare interface Window {
  Buffer: Buffer;
}
