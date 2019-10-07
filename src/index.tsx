/* Application setup */
import * as React from "react";
import { render } from "react-dom";
import { App } from "./containers/app";
import { Routes } from "./containers/routes";
import { Provider as MobxProvider } from "mobx-react";
import { rootStore } from "./stores";
import { setupConfiguration } from "configuration";

setupConfiguration("enterprise");

render(
	<App>
		<MobxProvider {...rootStore}>
			<Routes />
		</MobxProvider>
	</App>,
	document.getElementById("app"),
);
