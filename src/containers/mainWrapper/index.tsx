import * as React from "react";
// import RootStore from "stores";

const s = require("./mainWrapper.scss");

interface Props {}
function MainWrapper(props: React.PropsWithChildren<Props>) {
	// const { authStore } = React.useContext(RootStore);

	// const { logout, user } = authStore;

	return (
		<div className={s.mainWrapper}>
			<div className={s.content}>{props.children}</div>
		</div>
	);
}

export { MainWrapper };
