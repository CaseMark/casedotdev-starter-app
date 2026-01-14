declare module 'rtf-parser' {
  export interface RTFContent {
    content: Array<string | RTFContent>;
  }

  export interface RTFDocument {
    content: Array<string | RTFContent>;
  }

  export type ParseCallback = (err: Error | null, doc: RTFDocument) => void;

  export function string(rtfString: string, callback: ParseCallback): void;
  export function stream(stream: NodeJS.ReadableStream, callback: ParseCallback): void;

  const parse: {
    (callback: ParseCallback): NodeJS.WritableStream;
    string: typeof string;
    stream: typeof stream;
  };

  export default parse;
}
