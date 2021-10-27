import { OnDestroy, OnInit, Component } from "@angular/core";
import { FormControl } from "@angular/forms";
import { MatIconRegistry } from "@angular/material/icon";
import { DomSanitizer } from "@angular/platform-browser";
import { generateCSharpServerSource } from "@sdkgen/csharp-generator";
import { generateDartClientSource } from "@sdkgen/dart-generator";
import { generateAndroidClientSource } from "@sdkgen/kotlin-generator";
import { generateSwiftClientSource } from "@sdkgen/swift-generator";
import {
  generateBrowserClientSource,
  generateNodeClientSource,
  generateNodeServerSource,
  generateTypescriptInterfaces,
} from "@sdkgen/typescript-generator";
import { saveAs } from "file-saver";
import { Subscription } from "rxjs";

import { SdkgenService, SdkgenState } from "./sdkgen.service";

interface Tab {
  id: number;
  type: "simple" | "advanced";
  function?: string;
}

type SdkgenTarget =
  | "typescript_nodeserver"
  | "typescript_nodeclient"
  | "typescript_web"
  | "typescript_interfaces"
  | "flutter"
  | "csharp_server"
  | "kotlin_android"
  | "kotlin_android_without_callbacks"
  | "swift_ios"
  | "rxswift_ios";

@Component({
  selector: "app-root",
  templateUrl: "app.component.html",
  styleUrls: ["app.component.scss"],
})
export class AppComponent implements OnInit, OnDestroy {
  state$?: Subscription;
  state?: SdkgenState;

  selected = new FormControl(0);
  tabs: Tab[] = [{ id: 0, type: "advanced" }];
  tabIndex = 1;

  constructor(
    public sdkgen: SdkgenService,
    private domSanitizer: DomSanitizer,
    private matIconRegistry: MatIconRegistry,
  ) {
    for (const icon of ["typescript", "dot-net", "kotlin", "swift", "dart"]) {
      this.matIconRegistry.addSvgIcon(icon, this.domSanitizer.bypassSecurityTrustResourceUrl(`assets/${icon}.svg`));
    }
  }

  ngOnInit() {
    this.state$ = this.sdkgen.state$.subscribe(state => {
      this.state = state ?? undefined;
    });
  }

  ngOnDestroy() {
    this.state$?.unsubscribe();
  }

  addSimpleTab(fn: string) {
    this.tabs.push({ id: this.tabIndex++, function: fn, type: "simple" });
    this.selected.setValue(this.tabs.length);
  }

  addAdvancedTab() {
    this.tabs.push({ id: this.tabIndex++, type: "advanced" });
    this.selected.setValue(this.tabs.length);
  }

  closeTab(tab: Tab) {
    this.tabs.splice(this.tabs.indexOf(tab), 1);
    this.selected.setValue(0);
  }

  downloadTarget(target: SdkgenTarget) {
    if (!this.state) {
      return;
    }

    let source;
    let fileName;

    switch (target) {
      case "typescript_nodeserver": {
        source = generateNodeServerSource(this.state.astRoot);
        fileName = "node-server.ts";
        break;
      }

      case "typescript_nodeclient": {
        source = generateNodeClientSource(this.state.astRoot);
        fileName = "node-client.ts";
        break;
      }

      case "typescript_web": {
        source = generateBrowserClientSource(this.state.astRoot);
        fileName = "web-client.ts";
        break;
      }

      case "typescript_interfaces": {
        source = generateTypescriptInterfaces(this.state.astRoot);
        fileName = "interfaces.ts";
        break;
      }

      case "flutter": {
        source = generateDartClientSource(this.state.astRoot);
        fileName = "flutter-client.dart";
        break;
      }

      case "csharp_server": {
        source = generateCSharpServerSource(this.state.astRoot);
        fileName = "csharp-server.cs";
        break;
      }

      case "kotlin_android": {
        source = generateAndroidClientSource(this.state.astRoot, true);
        fileName = "android-client.kt";
        break;
      }

      case "kotlin_android_without_callbacks": {
        source = generateAndroidClientSource(this.state.astRoot, false);
        fileName = "android-client-no-callbacks.kt";
        break;
      }

      case "swift_ios": {
        source = generateSwiftClientSource(this.state.astRoot, false);
        fileName = "ios-client.swift";
        break;
      }

      case "rxswift_ios": {
        source = generateSwiftClientSource(this.state.astRoot, true);
        fileName = "ios-client-rx.swift";
        break;
      }
    }

    saveAs(new Blob([source], { type: "application/octet-stream" }), fileName);
  }
}
