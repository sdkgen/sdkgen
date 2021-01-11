/* Application setup */
import { setupConfiguration } from "configuration";
import { Provider as MobxProvider } from "mobx-react";
import * as React from "react";
import { render } from "react-dom";

import { App } from "./containers/app";
import { Routes } from "./containers/routes";
import { rootStore } from "./stores";

setupConfiguration();

render(
  <App>
    <MobxProvider {...rootStore}>
      <Routes />
    </MobxProvider>
  </App>,
  document.getElementById("app"),
);
