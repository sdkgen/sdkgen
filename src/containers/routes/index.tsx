import * as React from "react";
import { Router } from "react-router";
import { Route, Switch } from "react-router-dom";
import loadable, { Options } from "@loadable/component";
import { syncHistoryWithStore } from "mobx-react-router";
import { rootStore } from "stores";
import { createBrowserHistory } from "history";
const history = syncHistoryWithStore(createBrowserHistory(), rootStore.routerStore);

import { MainWrapper } from "containers/mainWrapper";
import { observer } from "mobx-react-lite";
// import Rootstore from "stores";
import { Loading } from "components/loading";

const asyncOptions: Options<any> = {
	fallback: <Loading />,
};

const NotFound = loadable(() => import("pages/notfound"), asyncOptions);
const Home = loadable(() => import("pages/home"), asyncOptions);

export const Routes = observer(() => {
	return (
		<Router history={history}>
			<MainWrapper>
				<Switch>
					<Route path="/" exact component={Home} />
					<Route component={NotFound} />
				</Switch>
			</MainWrapper>
		</Router>
	);
});
