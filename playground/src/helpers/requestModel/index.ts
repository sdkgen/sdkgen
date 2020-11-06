import { persistEndpointBookmarkStatus } from "helpers/localStorage/bookmarkedEndpoints";
import { observable } from "mobx";
import { AnnotationJson } from "resources/types/ast";

export type RequestStatus = "notFetched" | "success" | "fetching" | "error";

export interface ModelAnotations {
  func: AnnotationJson[];
  args: Record<
    string, // ArgumentName
    AnnotationJson[]
  >;
}

interface ConstructorArgument {
  name: string;
  defaultArgsMock: any;
  baseUrl: string;
  deviceId: string;
  annotations: ModelAnotations;
  bookmarked: boolean;
}

export class requestModel {
  public args: any;

  public baseUrl: string;

  public deviceId: string;

  public name: string;

  public annotations: ModelAnotations;

  @observable
  public response?: any;

  @observable
  public loading: boolean;

  @observable
  public error: string | undefined;

  @observable
  public status: RequestStatus;

  @observable
  public bookmarked: boolean;

  public toogleBookmark(): void {
    this.bookmarked = !this.bookmarked;
    persistEndpointBookmarkStatus(this.name, this.bookmarked);
  }

  public async call(args: unknown, callBack?: (status: RequestStatus) => void): Promise<void> {
    this.args = args;
    this.loading = true;
    this.status = "fetching";

    const url = `${this.baseUrl}/${this.name}`;

    const requestBody = {
      args,
      device: {
        id: this.deviceId,
        type: "web",
      },
      id: "sdkgen-playground",
      name: this.name,
    };

    try {
      const r = await fetch(url, {
        body: JSON.stringify(requestBody),
        cache: "no-cache",
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const res = await r.json();

      if (res.ok) {
        this.response = res.result;
        this.status = "success";
        if (callBack) {
          callBack("success");
        }
      } else {
        this.status = "error";
        this.error = `${res.error.type}: ${res.error.message}`;
        if (callBack) {
          callBack("error");
        }
      }
    } catch (err) {
      this.status = "error";
      this.error = err.message;
      if (callBack) {
        callBack("error");
      }
    } finally {
      this.loading = false;
    }
  }

  public reset(): void {
    this.loading = false;
    this.response = undefined;
    this.error = undefined;
    this.status = "notFetched";
  }

  constructor(config: ConstructorArgument) {
    // MOCK
    this.args = config.defaultArgsMock;
    this.name = config.name;
    this.deviceId = config.deviceId;
    this.baseUrl = config.baseUrl;
    this.annotations = config.annotations;
    this.bookmarked = config.bookmarked;
    this.loading = false;
    this.response = undefined;
    this.error = undefined;
    this.status = "notFetched";
  }
}
