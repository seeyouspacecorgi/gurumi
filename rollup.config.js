import svelte from "rollup-plugin-svelte";
import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import { terser } from "rollup-plugin-terser";
import postcssImport from 'postcss-import';
import autoprefixer from 'autoprefixer';
import sveltePreprocess from 'svelte-preprocess';

const production = !process.env.ROLLUP_WATCH;

export default {
  input: "index.js",
  output: {
    sourcemap: true,
    format: "iife",
    name: "app",
    file: "public/bundle.js"
  },
  plugins: [
    svelte({
      dev: !production,
      preprocess: sveltePreprocess({
        postcss:{
          plugins: [
            autoprefixer(),
            postcssImport()
          ]
        },
      }),
      css: css => {
        css.write("public/bundle.css");
      },
    }),
    resolve(),
    commonjs(),
    production && terser()
  ]
};
