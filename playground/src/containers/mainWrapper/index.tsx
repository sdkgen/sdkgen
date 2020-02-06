import * as React from "react";
// import RootStore from "stores";
import { MainHeader } from "components/header";
import s from "./mainWrapper.scss";

interface Props {}
function MainWrapper(props: React.PropsWithChildren<Props>) {
	// const { authStore } = React.useContext(RootStore);

	// const { logout, user } = authStore;

	return (
		<div className={s.mainWrapper}>
			<div className={s.top}>
				<div className={s.constraint}>
					<MainHeader />
				</div>
			</div>
			<div className={s.content}>
				<div className={s.constraint}>
					<div className={s.wrapper}>{props.children}</div>
				</div>
			</div>
		</div>
	);
}

export { MainWrapper };
