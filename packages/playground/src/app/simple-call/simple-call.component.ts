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
  initialExtras = `{\n  "key": "value"\n}\n`;
  extras = this.initialExtras;
  response?: any;
  busy = false;

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
    try {
      this.busy = true;

      {
        // eslint-disable-next-line
        const events = this.consoleItems;

        eval(wrapper);
      }

      if (this.extras && this.extras !== this.initialExtras) {
        const extrasJson = JSON.parse(this.extras);
        const extraKeys = Object.keys(extrasJson);

        for (const key of extraKeys) {
          this.client?.extra.set(key, extrasJson[key]);
        }
      }

      const exec = (this.client as unknown as Record<string, (data: any) => Promise<any>>)[this.fn](
        JSON.parse(this.code),
      );

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
      this.selected.setValue(2);
      this.busy = false;
    }
  }

  generateFunctionCode(astRoot: AstRoot, value: string) {
    const args = astRoot.operations.find(op => op.name === value)?.args;

    if (args) {
      this.code = JSON.stringify(this.sdkgen.buildJsonObject(args), null, 2);
    }
  }
}
