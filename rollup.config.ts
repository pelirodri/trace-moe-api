import esbuild from "rollup-plugin-esbuild";
import dts from "rollup-plugin-dts";

export default [
	{
		input: "src/index.ts",
		output: [
			{
				file: "dist/index.js",
				format: "es"
			},
			{
				file: "dist/index.cjs",
				format: "cjs"
			}
		],
		external: [
			"fs",
			"path",
			"axios",
			/lodash/
		],
		plugins: [
			esbuild({
				minify: true,
				target: "esnext"
			}),
		]
	},
	{
		input: "src/index.ts",
		output: {
			file: "dist/index.d.ts",
			format: "es"
		},
		plugins: [
			dts()
		]
	}
];
