import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import { faPause, faPlay, faRedo } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import classNames from "classnames";
import type { RequestStatus } from "helpers/requestModel";
import * as React from "react";

import s from "./bottom.scss";

interface BottomProps {
  onClick(status: RequestStatus): void;
  status: RequestStatus;
}
export default function Bottom(props: BottomProps): JSX.Element {
  const icons: Record<RequestStatus, IconProp> = {
    error: faRedo,
    fetching: faPause,
    notFetched: faPlay,
    success: faRedo,
  };
  const labels: Record<RequestStatus, string> = {
    error: "Error, Retry?",
    fetching: "Fetching",
    notFetched: "Make Request",
    success: "Success, Retry?",
  };
  const colors: Record<RequestStatus, string> = {
    error: s.red,
    fetching: s.orange,
    notFetched: s.blue,
    success: s.green,
  };
  const selectedIcon = icons[props.status];
  const selectedLabel = labels[props.status];
  const classModifier = colors[props.status];

  return (
    <div className={classNames(s.bottom, classModifier)} onClick={() => props.onClick(props.status)} role="button">
      <div className={s.label}>{selectedLabel}</div>
      <FontAwesomeIcon size="xs" icon={selectedIcon} className={s.icon} />
    </div>
  );
}
