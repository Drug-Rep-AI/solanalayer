import next from "eslint-config-next";

const config = [...next, { ignores: [".next/**", "out/**", "public/**", "next-env.d.ts"] }];

export default config;
