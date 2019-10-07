import * as React from "react";

const s = require("./loading.scss");

export const Loading = () => (
	<div className={s.wrapper}>
		<div className={s.ldsSpinner}>
			<div />
			<div />
			<div />
			<div />
			<div />
			<div />
			<div />
			<div />
			<div />
			<div />
			<div />
			<div />
		</div>
	</div>
);
