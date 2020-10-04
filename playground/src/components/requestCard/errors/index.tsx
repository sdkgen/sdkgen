import * as React from "react";
import s from "./errors.scss";

interface Props {
	error: string | undefined;
}

export function Errors(props: Props) {
	return props.error ? (
		<pre className={s.pre}>{props.error}</pre>
	) : (
		<div className={s.empty}>There is no errors</div>
	);
}
