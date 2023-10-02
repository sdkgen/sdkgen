import { Component } from "@angular/core";

import packageJson from "../../../package.json";

@Component({
  selector: "app-dialog-about",
  templateUrl: "./dialog-about.component.html",
  styleUrls: ["./dialog-about.component.scss"],
})
export class DialogAboutComponent {
  version = packageJson.version;
}
