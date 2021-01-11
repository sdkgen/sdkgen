import * as React from "react";

import s from "./loading.scss";

export function Loading(): JSX.Element {
  return (
    <div className={s.wrapper}>
      <div className={s.loader} />
    </div>
  );
}

export function PageLoading(): JSX.Element {
  return (
    <div className={s.bigWrapper}>
      <div className={s.loader} />
    </div>
  );
}
