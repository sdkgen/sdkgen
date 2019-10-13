import * as React from "react";
import { Link } from "react-router-dom";
import classnames from "classnames";
import RootStore from "stores";
import { observer } from "mobx-react-lite";
const s = require("./header.scss");

interface LinkInfo {
	to: string;
	label: string;
}

const links: LinkInfo[] = [
	{ to: "/", label: "Home" },
	{ to: "/favorites", label: "Favorites" },
	{ to: "/config", label: "Config" },
];

export const MainHeader = observer(Header);
function Header() {
	const { routerStore } = React.useContext(RootStore);

	console.log("location", routerStore.location);
	const activePath = routerStore.location.pathname;
	const Links = links.map(l => (
		<Link key={l.to} to={l.to}>
			<div className={classnames(s.link, l.to === activePath && s.active)}>{l.label}</div>
		</Link>
	));

	return (
		<div className={s.header}>
			<div className={s.top}>
				<div className={s.logo} />
				<div>
					<div className={s.title}>SDKGEN Playground</div>
					<div className={s.name}>the fly of the mockingbird</div>
				</div>
			</div>
			<div className={s.actions}>{Links}</div>
		</div>
	);
}
