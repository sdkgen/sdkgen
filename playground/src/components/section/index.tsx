import classnames from "classnames";
import * as React from "react";

import s from "./section.scss";

interface TitleProps {
  title: string;
  featured?: boolean;
}

export function Section(props: React.PropsWithChildren<TitleProps>): JSX.Element {
  const { title, featured, children } = props;

  return (
    <div className={classnames(s.section, featured && s.featured)}>
      <div className={s.title}>{title}</div>
      <div className={s.childrenWrapper}>{children}</div>
    </div>
  );
}
