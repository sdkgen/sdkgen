import loadable, { Options } from "@loadable/component";
import { PageLoading } from "components/loading";
import { MainWrapper } from "containers/mainWrapper";
import { createBrowserHistory } from "history";
import { observer } from "mobx-react-lite";
import { syncHistoryWithStore } from "mobx-react-router";
import * as React from "react";
import { Router } from "react-router";
import { Route, Switch } from "react-router-dom";
import { rootStore } from "stores";
const history = syncHistoryWithStore(createBrowserHistory(), rootStore.routerStore);

const asyncOptions: Options<any> = {
	fallback: <PageLoading />,
};

const NotFound = loadable(() => import("pages/notfound"), asyncOptions);
const Home = loadable(() => import("pages/home"), asyncOptions);
const Configuration = loadable(() => import("pages/condiguration"), asyncOptions);

export const Routes = observer(() => {
	return (
		<Router history={history}>
			<MainWrapper>
				<Switch>
					<Route path="/playground/" exact component={Home} />
					<Route path="/playground/configuration" component={Configuration} />
					<Route component={NotFound} />
				</Switch>
			</MainWrapper>
		</Router>
	);
});
