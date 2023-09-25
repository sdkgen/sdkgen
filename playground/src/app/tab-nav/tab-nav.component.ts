import { OnInit, Component } from "@angular/core";
import { FormControl } from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import { jsonToAst } from "@sdkgen/parser";
import { ToastrService } from "ngx-toastr";

import { DialogAboutComponent } from "../dialog-about/dialog-about.component";
import { SdkgenService } from "../sdkgen.service";

@Component({
  selector: "app-tab-nav",
  templateUrl: "./tab-nav.component.html",
  styleUrls: ["./tab-nav.component.scss"],
})
export class TabNavComponent implements OnInit {
  loading = false;
  url = new FormControl("");

  constructor(
    private sdkgen: SdkgenService,
    private toastr: ToastrService,
    private dialog: MatDialog,
  ) {}

  ngOnInit() {
    // TODO: this doesn't support APIs under a path other than /
    fetch("/ast.json")
      .then(result => {
        if (result.ok) {
          this.url.setValue(`${window.location.protocol}//${window.location.host}`);
          void this.loadUrl();
        }
      })
      .catch(() => {});
  }

  async loadUrl(event?: Event) {
    event?.preventDefault();

    try {
      this.loading = true;

      if (!/^https?:\/\//.test(this.url.value!)) {
        this.url.setValue(`https://${this.url.value}`);
      }

      const parsedUrl = new URL(this.url.value!);

      parsedUrl.pathname += `${parsedUrl.pathname.endsWith("/") ? "" : "/"}ast.json`;

      const astUrl = parsedUrl.toString();

      console.debug("astUrl", astUrl);

      const result = await fetch(astUrl).then(async resp => (resp.ok ? resp.json() : resp));

      if (result instanceof Response) {
        if (result instanceof Error) {
          throw result;
        } else {
          throw new Error(result.statusText);
        }
      }

      if (!result.errors || !result.functionTable || !result.typeTable) {
        throw new Error("Invalid AST");
      }

      // Aguardar até o Monaco ser carregado
      while (typeof monaco === "undefined") {
        await new Promise(resolve => setTimeout(resolve, 250));
      }

      console.debug("astJson", result);

      this.sdkgen.state$.next({
        astJson: result,
        astRoot: jsonToAst(result),
        url: this.url.value!,
      });
    } catch (e: unknown) {
      this.toastr.error(e instanceof Error ? e.message : JSON.stringify(e), "Erro ao carregar AST", {
        positionClass: "toast-bottom-right",
      });
    } finally {
      this.loading = false;
    }
  }

  openAbout() {
    this.dialog.open(DialogAboutComponent);
  }
}
