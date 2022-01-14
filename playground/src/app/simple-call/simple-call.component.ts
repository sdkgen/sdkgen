import { OnDestroy, OnInit, Component, Input } from "@angular/core";
import { FormControl } from "@angular/forms";
import { SdkgenHttpClient } from "@sdkgen/browser-runtime";
import { AstRoot } from "@sdkgen/parser";
import { Subscription } from "rxjs";

import { ConsoleItem, ConsoleItemType } from "../console/console.types";
import { SdkgenService } from "../sdkgen.service";
import { unwrap, wrapper } from "../utils/code-execution";

@Component({
  selector: "app-simple-call",
  templateUrl: "./simple-call.component.html",
  styleUrls: ["./simple-call.component.scss"],
})
export class SimpleCallComponent implements OnInit, OnDestroy {
  state$?: Subscription;

  @Input("fn")
  fn!: string;

  editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
    theme: "vs-dark",
    language: "json",
  };

  client?: SdkgenHttpClient;
  code = "";
  response?: any;

  selected = new FormControl(0);
  consoleItems: ConsoleItem[] = [];

  constructor(private sdkgen: SdkgenService) {}

  ngOnInit() {
    this.state$ = this.sdkgen.state$.subscribe(state => {
      if (!state) {
        return;
      }

      this.generateFunctionCode(state.astRoot, this.fn);
      this.client = this.sdkgen.getSdkgenClient(state.url, state.astJson);
    });
  }

  ngOnDestroy() {
    this.state$?.unsubscribe();
  }

  async run() {
    {
      // eslint-disable-next-line
      const events = this.consoleItems;

      eval(wrapper);
    }

    const exec = (this.client as unknown as Record<string, (data: any) => Promise<any>>)[this.fn](
      JSON.parse(this.code),
    );

    try {
      this.response = { result: await exec };
    } catch (e: any) {
      this.consoleItems.push({ type: ConsoleItemType.ERROR, message: e.toString() });
      delete e.toString;
      this.response = {
        error: {
          type: e.type,
          message: e.message,
          data: e.data,
        },
      };
    } finally {
      eval(unwrap);
      this.selected.setValue(1);
    }
  }

  generateFunctionCode(astRoot: AstRoot, value: string) {
    const args = astRoot.operations.find(op => op.name === value)?.args;

    if (args) {
      this.code = JSON.stringify(this.sdkgen.buildJsonObject(args), null, 2);
    }
  }
}
