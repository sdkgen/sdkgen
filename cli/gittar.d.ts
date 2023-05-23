declare module "gittar" {
  interface IFetchOps {
    host?: string;
    useCache?: boolean;
    force?: boolean;
  }

  export function fetch(repo: string, opts?: IFetchOps): Promise<string>;
  export function extract(file: string, dest: string, opts?: any): Promise<string>;
}
