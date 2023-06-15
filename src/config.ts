// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = "Zhulegend's Blog";
export const SITE_DESCRIPTION =
  "欢迎来到我的网站，这里会不定时更新Swift、Python、Js/Ts、Rust相关博客";
export const TWITTER_HANDLE = "@yourtwitterhandle";
export const MY_NAME = "Zijun Zhu";

// setup in astro.config.mjs
const BASE_URL = new URL(import.meta.env.SITE);
export const SITE_URL = BASE_URL.origin;
