import { getLocalStorageBookmarks } from "helpers/localStorage/bookmarkedEndpoints";
import type { ModelAnotations } from "helpers/requestModel";
import { requestModel } from "helpers/requestModel";
import { observable } from "mobx";
import type { ArgsType, AstJson, TypeDescription, TypeTable } from "resources/types/ast";
import { v4 as uuidV4 } from "uuid";

import type { RootStore } from ".";

export const simpleStringTypes = ["string", "cep", "cnpj", "cpf", "email", "html", "phone", "url", "xml"];
export const simpleTypes = ["json", "bool", "hex", "uuid", "base64", "int", "uint", "float", "money", "void", "latlng", ...simpleStringTypes];

export class RequestsStore {
  public rootStore: RootStore;

  @observable
  public AST: AstJson | null = null;

  public api: Record<string, requestModel> = {};

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;
    this.fetchAST();
  }

  public async fetchAST(): Promise<void> {
    try {
      const response = await fetch(`${this.rootStore.configStore.endpointUrl}/ast.json`);
      const ast = await response.json();

      this.AST = ast;
      if (ast) {
        this.createModels(ast);
      }
    } catch (err) {
      console.log(err);
    }
  }

  private createMockBasedOnTypes(args: ArgsType, typeTable: TypeTable) {
    return Object.keys(args).reduce((acc, curKey) => ({ ...acc, [curKey]: this.encodeTransform(typeTable, args[curKey]) }), {});
  }

  private simpleTypeMock(type: string) {
    const types: Record<string, any> = {
      base64: "c2RrZ2Vu",
      bool: true,
      cep: undefined,
      cnpj: undefined,
      cpf: undefined,
      email: "hello@example.com",
      float: 12.3,
      hex: "deadbeef",
      int: 123,
      json: { anything: [1, 2, 3] },
      latlng: undefined,
      money: 123,
      phone: undefined,
      safehtml: "<body>Hello</body>",
      string: "string",
      uint: 123,
      url: location.origin,
      uuid: uuidV4(),
      void: undefined,
      xml: "<aa></aa>",
    };

    if (types[type] === undefined) {
      console.log(`Unknown simple type '${type}'`);
      return null;
    }

    return types[type];
  }

  private encodeTransform(typeTable: TypeTable, type: TypeDescription): any {
    if (Array.isArray(type)) {
      // Things like "car" | "motorcycle"
      return type[0];
    } else if (typeof type === "object") {
      // Resolution of complex type
      const obj: any = {};

      for (const [key, value] of Object.entries(type)) {
        obj[key] = this.encodeTransform(typeTable, value);
      }

      return obj;
    } else if (type.endsWith("?")) {
      // Nullish
      return this.encodeTransform(typeTable, type.replace("?", ""));
    } else if (type.endsWith("[]")) {
      // ArrayOf
      return [1, 2, 3].map(() => this.encodeTransform(typeTable, type.replace("[]", "")));
    } else if (simpleTypes.includes(type)) {
      // Simple types
      return this.simpleTypeMock(type);
    } else if (type === "bytes") {
      return "deadbeef";
    } else if (type === "date") {
      return new Date().toISOString().split("T")[0];
    } else if (type === "datetime") {
      return new Date().toISOString().replace("Z", "");
    }

    // Complex type
    const resolved = typeTable[type];

    if (resolved) {
      return this.encodeTransform(typeTable, resolved);
    }

    throw new Error(`Unknown type '${type}'`);
  }

  public getAnotations = (AST: AstJson, functionName: string): ModelAnotations => {
    const functionAnnotations = AST.annotations[`fn.${functionName}`] ?? [];

    const regex = RegExp(`fn.${functionName}\\.[^.]*`, "u");
    const argsKeys = Object.keys(AST.annotations).filter(target => regex.test(target));

    const argsAnnotations = argsKeys.reduce((acc, argKey) => {
      /*
       * Breaks 'fn.getBalance.bankCode' into ["fn", "getBalance", "bankCode"]
       * and gets the last part, that is the argument name
       */
      const pieces = argKey.split(".");

      return {
        ...acc,
        [pieces[2]]: AST.annotations[argKey],
      };
    }, {});

    const annotations: ModelAnotations = {
      args: argsAnnotations,
      func: functionAnnotations,
    };

    return annotations;
  };

  private createBookmarkedEndpointIndex = (): Record<string, boolean | undefined> => {
    return getLocalStorageBookmarks().reduce((acc, name) => ({ ...acc, [name]: true }), {});
  };

  public createModels(ast: AstJson): void {
    console.log("createModels");
    const { endpointUrl, deviceId } = this.rootStore.configStore;

    const functions = Object.entries(ast.functionTable);
    const bookmarkedEndpointsIndex = this.createBookmarkedEndpointIndex();

    this.api = functions.reduce((acc, [fName, fStruct]) => {
      const argsMock = this.createMockBasedOnTypes(fStruct!.args, ast.typeTable);
      const annotations = this.getAnotations(ast, fName);

      if (annotations.func.some(ann => ann.type === "hidden")) {
        return acc;
      }

      return {
        ...acc,
        [fName]: new requestModel({
          annotations,
          baseUrl: endpointUrl,
          bookmarked: Boolean(bookmarkedEndpointsIndex[fName]),
          defaultArgsMock: argsMock,
          deviceId,
          name: fName,
        }),
      };
    }, {});
  }
}
