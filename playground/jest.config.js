module.exports = {
	roots: ["<rootDir>/src"],
	transform: {
		"^.+\\.tsx?$": "ts-jest",
	},
	snapshotSerializers: ["enzyme-to-json/serializer"],
	setupFilesAfterEnv: ["<rootDir>/src/configuration/enzyme.ts"],
	moduleNameMapper: {
		"\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
			"<rootDir>/__mocks__/mocks.js",
		"\\.(scss|sass|css)$": "identity-obj-proxy",
	},
};
