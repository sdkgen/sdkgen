import * as React from "react";

const s = require("./loading.scss");

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
