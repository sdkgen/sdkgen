import * as React from "react";
import { Button } from "antd";
// import RootStore from "stores";

const s = require("./mainWrapper.scss");

interface Props {}
function MainWrapper(props: React.PropsWithChildren<Props>) {
	// const { authStore } = React.useContext(RootStore);

	// const { logout, user } = authStore;

	return (
		<div className={s.mainWrapper}>
			<div className={s.header}>
				<div>SISTEMAS GERENCIADOR DE TCC</div>
				<div className={s.options}>
					{/* <div>{(user && user.userType && user.userType.name) || ""}</div> */}
					<Button type="link">
						{/* ({(user && user.firstName) || "USER"})&nbsp;Logout */}
					</Button>
				</div>
			</div>

			<div className={s.navbar}>
				<div className={s.top}>
					<div className={s.logo} />
					<div>sgtcc</div>
				</div>
			</div>

			<div className={s.content}>{props.children}</div>
		</div>
	);
}

export { MainWrapper };
