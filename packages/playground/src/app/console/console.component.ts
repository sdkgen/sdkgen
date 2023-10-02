import { Component, Input } from "@angular/core";

import { ConsoleItem, ConsoleItemType } from "./console.types";

@Component({
  selector: "app-console",
  templateUrl: "./console.component.html",
  styleUrls: ["./console.component.scss"],
})
export class ConsoleComponent {
  itemTypes = ConsoleItemType;

  @Input("items")
  items: ConsoleItem[] = [];
}
