import { Component } from "@angular/core";
import { MatDialogRef } from "@angular/material/dialog";

import { GlobalExtrasService } from "../global-extras.service";

const placeholder = `{\n  "key": "value"\n}\n`;
const emptyExtras = `{\n  \n}\n`;

@Component({
  selector: "app-dialog-global-extras",
  templateUrl: "./dialog-global-extras.component.html",
  styleUrls: ["./dialog-global-extras.component.scss"],
})
export class DialogGlobalExtrasComponent {
  editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
    theme: "vs-dark",
    language: "json",
    minimap: { enabled: false },
  };

  text: string;
  error?: string;

  constructor(
    private globalExtras: GlobalExtrasService,
    private dialogRef: MatDialogRef<DialogGlobalExtrasComponent>,
  ) {
    this.text = globalExtras.text || placeholder;
  }

  save() {
    try {
      this.globalExtras.save(this.text);
      this.dialogRef.close();
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : JSON.stringify(e);
    }
  }

  clear() {
    this.text = emptyExtras;
    this.error = undefined;
  }
}
