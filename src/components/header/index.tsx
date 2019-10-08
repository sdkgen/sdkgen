import * as React from "react";
import { Link } from "react-router-dom";

const s = require("./header.scss");

export const Header = () => (
	<div className={s.header}>
		<div className={s.title}>
			<div className={s.logo} />
			<h1>SDKGEN Playground</h1>
		</div>
		<div className={s.actions}>
			<Link to="/">Home</Link>
			<Link to="/config">Config</Link>
		</div>
	</div>
);
