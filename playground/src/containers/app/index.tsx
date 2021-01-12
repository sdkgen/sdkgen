import * as React from "react";

import ErrorBoundary from "../errorBoundary";
import s from "./app.scss";

interface Props {}

function App(props: React.PropsWithChildren<Props>): JSX.Element {
  return (
    <div className={s.app}>
      <ErrorBoundary>{props.children}</ErrorBoundary>
    </div>
  );
}

export { App };
