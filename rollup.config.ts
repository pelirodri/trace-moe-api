import esbuild from "rollup-plugin-esbuild";
import dts from "rollup-plugin-dts";

export default [
	{
		input: "src/index.ts",
		output: [
			{
				file: "dist/index.cjs",
				format: "cjs"
			},
			{
				file: "dist/index.mjs",
				format: "es"
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
