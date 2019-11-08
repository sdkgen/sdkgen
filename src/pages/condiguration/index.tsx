import { observer } from "mobx-react-lite";
import * as React from "react";
import RootStore from "stores";
import s from "./configuration.scss";

function Configuration() {
	const { configStore } = React.useContext(RootStore);
	const {
		deviceId,
		endpointUrl,
		canChangeEndpoint,
		setNewDeviceId,
		setNewEndpoint,
	} = configStore;

	return (
		<div className={s.content}>
			<div className={s.form}>
				{canChangeEndpoint && (
					<div className={s.item}>
						<label>API endpoint</label>
						<input
							type="text"
							defaultValue={endpointUrl || undefined}
							onBlur={ev => {
								setNewEndpoint(ev.target.value);
							}}
						/>
					</div>
				)}
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
