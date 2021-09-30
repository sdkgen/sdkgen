import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import { faClone, faCog } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import classnames from "classnames";
import { observer } from "mobx-react";
import * as React from "react";
import { Link, useLocation, withRouter } from "react-router-dom";

import s from "./header.scss";

interface LinkInfo {
  to: string;
  label: string;
  icon: IconProp;
}

const links: LinkInfo[] = [
  { icon: faClone, label: "Endpoints", to: "/playground/" },
  { icon: faCog, label: "Configuration", to: "/playground/configuration/" },
];

function Header() {
  const { pathname } = useLocation();

  const linkElements = links.map(l => (
    <Link key={l.to} to={l.to}>
      <div className={classnames(s.link, l.to === pathname ? s.active : "")}>
        <FontAwesomeIcon size="xs" icon={l.icon} className={s.icon} />
        {l.label}
      </div>
    </Link>
  ));
  const divider = <div className={s.divider} />;

  return (
    <div className={s.header}>
      <div className={s.top}>
        <div className={s.logo} />
        <div>
          <div className={s.title}>sdkgen Playground</div>
        </div>
      </div>
      <div className={s.actions}>
        {linkElements}
        {divider}
      </div>
    </div>
  );
}

export const MainHeader = withRouter(observer(Header));
