module.exports = ({ file, options, env }) => {
	const shouldBuildForProduction = env === "production";
	return {
		// plugins: shouldBuildForProduction ? [require("autoprefixer")] : [],
	};
};
