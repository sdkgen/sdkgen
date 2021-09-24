import type { Options } from "@loadable/component";
import loadable from "@loadable/component";
import { PageLoading } from "components/loading";
import { MainWrapper } from "containers/mainWrapper";
import { createBrowserHistory } from "history";
import { observer } from "mobx-react";
import { syncHistoryWithStore } from "mobx-react-router";
import * as React from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import { rootStore } from "stores";

syncHistoryWithStore(createBrowserHistory(), rootStore.routerStore);

const asyncOptions: Options<any> = {
  fallback: <PageLoading />,
};

const NotFound = loadable(async () => import("pages/notfound"), asyncOptions);
const Home = loadable(async () => import("pages/home"), asyncOptions);
const Configuration = loadable(async () => import("pages/condiguration"), asyncOptions);

export const Routes = observer(() => {
  return (
    <BrowserRouter>
      <MainWrapper>
        <Switch>
          <Route path="/playground/" exact component={Home} />
          <Route path="/playground/configuration" component={Configuration} />
          <Route component={NotFound} />
        </Switch>
      </MainWrapper>
    </BrowserRouter>
  );
});
