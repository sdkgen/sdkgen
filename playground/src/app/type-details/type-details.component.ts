import { OnInit, Component, Inject } from "@angular/core";
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { Type } from "@sdkgen/parser";

import { TypeDoc, getTypeDoc, getTypeLabels } from "../sdkgen.docs";

@Component({
  selector: "app-type-details",
  templateUrl: "./type-details.component.html",
  styleUrls: ["./type-details.component.scss"],
})
export class TypeDetailsComponent implements OnInit {
  constructor(
    public dialogRef: MatDialogRef<TypeDetailsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { type: Type; subdialog?: boolean },
    public dialog: MatDialog,
  ) {}

  labels: string[] = [];
  typeDoc?: TypeDoc;

  argumentsTableColumns = ["name", "type", "description"];

  ngOnInit() {
    this.labels = getTypeLabels(this.data.type);
    this.typeDoc = getTypeDoc(this.data.type);
  }

  // TODO: deduplicate
  getTooltip(type: Type) {
    // TODO: This needs to be optimized
    return getTypeDoc(type).shortDescription;
  }

  // TODO: deduplicate
  showDocumentation(type: Type) {
    this.dialog.open(TypeDetailsComponent, {
      position: {
        right: "0",
      },
      data: {
        type,
        subdialog: true,
      },
      height: "100vh",
      panelClass: ["dialog-no-border-radius", "dialog-responsive"],
    });
  }
}
