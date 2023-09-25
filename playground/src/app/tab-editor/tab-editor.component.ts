import { OnDestroy, OnInit, Component } from "@angular/core";
import { SdkgenHttpClient } from "@sdkgen/browser-runtime";
import { generateBrowserClientSource } from "@sdkgen/typescript-generator";
import { Subscription } from "rxjs";

import { ConsoleItem, ConsoleItemType } from "../console/console.types";
import { SdkgenService } from "../sdkgen.service";
import { unwrap, wrapper } from "../utils/code-execution";

@Component({
  selector: "app-tab-editor",
  templateUrl: "./tab-editor.component.html",
  styleUrls: ["./tab-editor.component.scss"],
})
export class TabEditorComponent implements OnInit, OnDestroy {
  state$?: Subscription;
  client?: SdkgenHttpClient;

  code = "";
  busy = false;

  editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
    theme: "vs-dark",
    language: "typescript",
  };

  consoleItems: ConsoleItem[] = [
    { type: ConsoleItemType.INFO, message: "Bem-vindo! A saída dos seus testes aparecerá aqui :)" },
  ];

  constructor(private sdkgen: SdkgenService) {}

  ngOnInit() {
    this.state$ = this.sdkgen.state$.subscribe(state => {
      if (!state) {
        return;
      }

      const browserClient = `${this.patchBrowserClientSource(
        generateBrowserClientSource(state.astRoot),
      )}\n\ndeclare const client: sdkgen.ApiClient;\n\n`;

      this.client = this.sdkgen.getSdkgenClient(state.url, state.astJson);

      monaco.languages.typescript.typescriptDefaults.getCompilerOptions().target =
        monaco.languages.typescript.ScriptTarget.ESNext;

      monaco.languages.typescript.typescriptDefaults.getCompilerOptions().module =
        monaco.languages.typescript.ModuleKind.ESNext;

      monaco.languages.typescript.typescriptDefaults.getDiagnosticsOptions().diagnosticCodesToIgnore = [1375];

      const model = monaco.editor.getModels().find(m => m.uri.toString().endsWith("client.d.ts"));

      if (model) {
        model.setValue(browserClient);
      } else {
        monaco.editor.createModel(browserClient, "typescript", monaco.Uri.parse("ts:filename/client.d.ts"));
      }

      const [initialOperation] = state.astRoot.operations;

      this.code = this.sdkgen.getTypeScriptCode(
        initialOperation.name,
        this.sdkgen.buildJsonObject(initialOperation.args),
      );
    });
  }

  ngOnDestroy() {
    this.state$?.unsubscribe();
  }

  patchBrowserClientSource(source: string) {
    const additionalMembers = `
      baseUrl: string;
      extra = new Map<string, any>();
      successHook: (result: any, name: string, args: any) => void = () => undefined;
      errorHook: (result: any, name: string, args: any) => void = () => undefined;
      async makeRequest(functionName: string, args: unknown): Promise<any>;
    `;

    return `declare namespace sdkgen {\n${source
      .substring(95, source.indexOf("const errClasses"))
      .replace(/ extends SdkgenError/g, " extends Error")
      .replace(/ extends SdkgenHttpClient/g, "")
      .replace(/{ return this.makeRequest\(.*$/gm, "")
      .replace(/ {\n {8}super\(baseUrl, astJson, errClasses\);\n {4}}/g, "")
      .replace("constructor(", `${additionalMembers}\nconstructor(`)}\n}\n`;
  }

  async run() {
    try {
      this.busy = true;

      await eval(`
        (async (client, events) => {
          ${wrapper}
          ${this.code}
        })
      `)(this.client, this.consoleItems).finally(() => eval(unwrap));
    } catch (e: any) {
      this.consoleItems.push({ type: ConsoleItemType.ERROR, message: e.toString() });
    }

    this.busy = false;
  }
}
