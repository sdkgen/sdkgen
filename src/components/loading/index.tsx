import * as React from "react";

const s = require("./loading.scss");

export const Loading = () => (
	<div className={s.wrapper}>
		<div className={s.loader} />
	</div>
);

export const PageLoading = () => (
	<div className={s.bigWrapper}>
		<div className={s.loader} />
	</div>
);
