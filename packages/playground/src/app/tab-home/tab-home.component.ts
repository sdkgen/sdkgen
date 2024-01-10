import { AfterViewInit, OnDestroy, OnInit, Component, EventEmitter, Output } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Field, Type } from "@sdkgen/parser";
import { Subscription } from "rxjs";

import { ResponsiveService } from "../responsive.service";
import { getTypeDoc } from "../sdkgen.docs";
import { SdkgenService } from "../sdkgen.service";
import { TypeDetailsComponent } from "../type-details/type-details.component";

interface EasyFunctionTableItemType {
  name: string;
  description?: string;
  type: string;
  rawType: Type;
}

interface EasyFunctionTableItem {
  name: string;
  description?: string;
  labels: Array<{ name: string; type: string; dataType?: Type }>;
  args: EasyFunctionTableItemType[];
  argsStr: string;
  argsFields: Field[];
  returns: Omit<EasyFunctionTableItemType, "name">;
  examples: Record<string, string>;
}

@Component({
  selector: "app-tab-home",
  templateUrl: "./tab-home.component.html",
  styleUrls: ["./tab-home.component.scss"],
})
export class TabHomeComponent implements OnInit, OnDestroy, AfterViewInit {
  isBelowMd = false;

  state$?: Subscription;
  responsive$?: Subscription;

  @Output("runFunction")
  runFunction = new EventEmitter<string>();

  fnTable!: EasyFunctionTableItem[];
  selectedFunction?: EasyFunctionTableItem;
  searchText = "";

  argumentsTableColumns = ["name", "type", "description"];

  editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
    theme: "vs-dark",
    language: "javascript",
  };

  constructor(
    public sdkgen: SdkgenService,
    public dialog: MatDialog,
    public responsive: ResponsiveService,
  ) {}

  ngOnInit() {
    this.state$ = this.sdkgen.state$.subscribe(state => {
      if (!state) {
        return;
      }

      this.selectedFunction = undefined;

      this.fnTable = state.astRoot.operations
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(operation => {
          const annotations = state.astJson.annotations[`fn.${operation.name}`];
          const argsExampleObject = this.sdkgen.buildJsonObject(operation.args);

          if (annotations?.find(a => a.type === "hidden")) {
            return null;
          }

          return {
            name: operation.name,
            description: annotations?.find(ann => ann.type === "description")?.value as string,
            args: operation.args.map(({ name, type }) => {
              const argAnns = [
                ...(state.astJson.annotations[`type.${type.name}.${name}`] ?? []),
                ...(state.astJson.annotations[`fn.${operation.name}.${name}`] ?? []),
              ];

              return {
                name,
                description: argAnns.find(x => x.type === "description")?.value as string,
                type: type.name,
                rawType: type,
              };
            }),
            argsStr: operation.args.map(arg => `${arg.name}: ${arg.type.name}`).join(", "),
            argsFields: operation.args,
            returns: {
              type: operation.returnType.name,
              rawType: operation.returnType,
            },
            labels:
              annotations
                ?.filter(ann => ["rest", "throws"].includes(ann.type))
                .map(ann => {
                  if (ann.type === "rest") {
                    return {
                      name: "REST",
                      type: `${ann.value.method} ${ann.value.path}`,
                    };
                  } else if (ann.type === "throws") {
                    return {
                      name: "THROWS",
                      type: ann.value,
                      dataType: state.astRoot.errors.find(error => error.name === ann.value)?.dataType,
                    };
                  }

                  return {
                    name: "?",
                    type: "?",
                  }; // shoudn't happen
                }) ?? [],
            throws: annotations?.find(ann => ann.type === "throws")?.value as string,
            examples: {
              typeScript: this.sdkgen.getTypeScriptCode(operation.name, argsExampleObject),
              kotlin: this.sdkgen.getKotlinCode(operation.name, operation.args),
              dart: this.sdkgen.getDartCode(operation.name, argsExampleObject),
              swift: this.sdkgen.getSwiftCode(operation.name, argsExampleObject),
            },
          };
        })
        .filter(x => Boolean(x)) as EasyFunctionTableItem[];
    });
  }

  ngOnDestroy() {
    this.state$?.unsubscribe();
    this.responsive$?.unsubscribe();
  }

  ngAfterViewInit() {
    this.responsive$ = this.responsive.isBelowMd().subscribe(isBelowMd => {
      this.isBelowMd = isBelowMd.matches;
    });
  }

  addSimpleCallTab() {
    this.runFunction.emit(this.selectedFunction?.name);
  }

  getTooltip(type: Type) {
    // TODO: This needs to be optimized
    return getTypeDoc(type).shortDescription;
  }

  showDocumentation(type: Type) {
    this.dialog.open(TypeDetailsComponent, {
      position: {
        right: "0",
        top: "0",
        bottom: "0",
      },
      data: {
        type,
      },
      height: "100vh",
      panelClass: ["dialog-no-border-radius", "dialog-responsive"],
    });
  }
}
