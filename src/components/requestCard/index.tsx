import * as React from "react";
import s from "./requestCard.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp, faLink } from "@fortawesome/free-solid-svg-icons";

export const RequestCard = Card;

function Card() {
	const [open, setOpen] = React.useState<boolean>(false);

	if (!open)
		return (
			<div className={s.closedCard} onClick={() => setOpen(true)}>
				<div className={s.callName}>
					<div>getEmployeesByName</div>
					<FontAwesomeIcon size="xs" icon={faLink} className={s.hrefIcon} />
				</div>
				<FontAwesomeIcon size="xs" icon={faChevronDown} className={s.icon} />
			</div>
		);

	return (
		<div className={s.openCard}>
			<div className={s.header} onClick={() => setOpen(false)}>
				<div className={s.callName}>
					<div>getEmployeesByName</div>
					<FontAwesomeIcon size="xs" icon={faLink} className={s.hrefIcon} />
				</div>
				<FontAwesomeIcon size="xs" icon={faChevronUp} className={s.icon} />
			</div>
			<div className={s.content}>content</div>
			<div className={s.bottom}>bottom</div>
		</div>
	);
}
