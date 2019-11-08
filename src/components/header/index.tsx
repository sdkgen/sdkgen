import * as React from "react";
import { Link } from "react-router-dom";
import classnames from "classnames";
import RootStore from "stores";
import { observer } from "mobx-react-lite";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClone, faCog } from "@fortawesome/free-solid-svg-icons";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import s from "./header.scss";

interface LinkInfo {
	to: string;
	label: string;
	icon: IconProp;
}

const links: LinkInfo[] = [
	{ to: "/", label: "Endpoints", icon: faClone },
	// { to: "/favorites", label: "Favorites", icon: faStar },
	{ to: "/configuration", label: "Configuration", icon: faCog },
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
					<div className={s.title}>SDKGEN Playground</div>
				</div>
			</div>
			<div className={s.actions}>
				{Links}
				{Divider}
			</div>
		</div>
	);
}
