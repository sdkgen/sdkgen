import { faBookmark, faChevronDown, faChevronUp, faCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import classNames from "classnames";
import { requestModel, RequestStatus } from "helpers/requestModel";
import { observer } from 'mobx-react-lite';
import * as React from "react";
import s from "./header.scss";

interface HeaderProps {
	open?: boolean;
	model: requestModel;
	closeCard?: () => void;
}
export default observer(Header)
function Header(props: HeaderProps) {
	const { open, closeCard, model } = props;

	const colors: Record<RequestStatus, string> = {
		notFetched: s.gray,
		fetching: s.orange,
		error: s.red,
		sucess: s.green,
		// timeout: s.purple,
	};
	const accentColorClass = colors[model.status];

	const onClickBookmark = (event: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
		event.stopPropagation();
		model.toogleBookmark();
	}

	if (!open)
		return (
			<>
				<div className={s.callName}>
					<div>
						<FontAwesomeIcon
							size="xs"
							//@ts-ignore
							icon={faCircle}
							className={classNames(s.statusCircle, accentColorClass)}
						/>
						{model.name}
					</div>
				</div>
				<div>
					<FontAwesomeIcon onClick={onClickBookmark} size="xs" icon={faBookmark} className={classNames(s.bookmarkIcon, model.bookmarked && s.bookmarked)} />
					<FontAwesomeIcon
						size="xs"
						//@ts-ignore
						icon={faChevronDown}
						className={s.icon}
					/>
				</div>
			</>
		);

	return (
		<div className={s.header} onClick={closeCard}>
			<div className={s.callName}>
				<div>
					<FontAwesomeIcon
						size="xs"
						//@ts-ignore
						icon={faCircle}
						className={classNames(s.statusCircle, accentColorClass)}
					/>
					{model.name}
				</div>
			</div>
			<div>
				<FontAwesomeIcon onClick={onClickBookmark} size="xs" icon={faBookmark} className={classNames(s.bookmarkIcon, model.bookmarked && s.bookmarked)} />
				<FontAwesomeIcon
					size="xs"
					//@ts-ignore
					icon={faChevronUp}
					className={s.icon}
				/>
			</div>
		</div>
	);
}
