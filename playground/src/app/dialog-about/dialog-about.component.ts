import { Component } from "@angular/core";

import { version, dependencies } from "../../../package.json";

@Component({
  selector: "app-dialog-about",
  templateUrl: "./dialog-about.component.html",
  styleUrls: ["./dialog-about.component.scss"],
})
export class DialogAboutComponent {
  version = version;
  dependencies = Object.entries(dependencies).filter(([name]) => name.startsWith("@sdkgen"));
}
