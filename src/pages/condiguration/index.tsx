import * as React from "react";
import s from "./configuration.scss";

import { observer } from "mobx-react-lite";

import RootStore from "stores";

function Configuration() {
	const { configStore } = React.useContext(RootStore);
	const { deviceId, endpointUrl, setNewDeviceId, setNewEndpoint } = configStore;
	console.log("AAAAA", deviceId, endpointUrl, setNewDeviceId, setNewEndpoint);

	return (
		<div className={s.content}>
			<div className={s.form}>
				<div className={s.item}>
					<label>API endpoint</label>
					<input
						type="text"
						defaultValue={endpointUrl || undefined}
						onBlur={ev => {
							console.log("onBlur", ev.target.value);
							setNewEndpoint(ev.target.value);
						}}
					/>
				</div>
				<div className={s.item}>
					<label>Device ID</label>
					<input
						type="text"
						defaultValue={deviceId || undefined}
						onBlur={ev => setNewDeviceId(ev.target.value)}
					/>
				</div>
			</div>
		</div>
	);
}

export default observer(Configuration);
