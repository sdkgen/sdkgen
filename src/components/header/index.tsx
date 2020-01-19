import { faClone, faCog } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import classnames from "classnames";
import { observer } from "mobx-react-lite";
import * as React from "react";
import { Link } from "react-router-dom";
import RootStore from "stores";
import s from "./header.scss";

interface LinkInfo {
	to: string;
	label: string;
	icon: any; // bad library types
}

const links: LinkInfo[] = [
	{ to: "/playground", label: "Endpoints", icon: faClone },
	// { to: "/playground/favorites", label: "Favorites", icon: faStar },
	{ to: "/playground/configuration", label: "Configuration", icon: faCog },
];

export const MainHeader = observer(Header);
function Header() {
	const { routerStore } = React.useContext(RootStore);

	const activePath = routerStore.location.pathname;
	const Links = links.map(l => (
		<Link key={l.to} to={l.to}>
			<div className={classnames(s.link, l.to === activePath && s.active)}>
				<FontAwesomeIcon size="xs" icon={l.icon} className={s.icon} />
				{l.label}
			</div>
		</Link>
	));
	const Divider = <div className={s.divider} />;

	return (
		<div className={s.header}>
			<div className={s.top}>
				<div className={s.logo} />
				<div>
					<div className={s.title}>sdkgen Playground</div>
				</div>
			</div>
			<div className={s.actions}>
				{Links}
				{Divider}
			</div>
		</div>
	);
}
