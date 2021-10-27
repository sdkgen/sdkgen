import { HttpClientModule } from "@angular/common/http";
import { NgModule } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatChipsModule } from "@angular/material/chips";
import { MatDialogModule } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from "@angular/material/menu";
import { MatTableModule } from "@angular/material/table";
import { MatTabsModule } from "@angular/material/tabs";
import { MatTooltipModule } from "@angular/material/tooltip";
import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { MonacoEditorModule } from "@materia-ui/ngx-monaco-editor";
import { AngularSplitModule } from "angular-split";
import { NgxJsonViewerModule } from "ngx-json-viewer";
import { ToastrModule } from "ngx-toastr";

import { AppComponent } from "./app.component";
import { ConsoleComponent } from "./console/console.component";
import { FilterPipe } from "./filter.pipe";
import { SimpleCallComponent } from "./simple-call/simple-call.component";
import { TabEditorComponent } from "./tab-editor/tab-editor.component";
import { TabHomeComponent } from "./tab-home/tab-home.component";
import { TabNavComponent } from "./tab-nav/tab-nav.component";
import { TypeDetailsComponent } from "./type-details/type-details.component";

@NgModule({
  declarations: [
    AppComponent,
    SimpleCallComponent,
    TabNavComponent,
    TabEditorComponent,
    TabHomeComponent,
    FilterPipe,
    ConsoleComponent,
    TypeDetailsComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    MonacoEditorModule,
    BrowserAnimationsModule,
    NgxJsonViewerModule,
    ToastrModule.forRoot(),
    AngularSplitModule,
    HttpClientModule,

    MatButtonModule,
    MatChipsModule,
    MatDialogModule,
    MatIconModule,
    MatMenuModule,
    MatTableModule,
    MatTabsModule,
    MatTooltipModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
