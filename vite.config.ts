import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// Required environment variables (testnet only)
const requiredEnvVars = [
	"VITE_PARENT_NAME", // e.g., "ethconfig.eth"
];

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "VITE_");

	// Validate required environment variables at build time
	const missing = requiredEnvVars.filter((name) => !env[name]);
	if (missing.length > 0) {
		throw new Error(
			`Missing required environment variables:\n  ${missing.join("\n  ")}`,
		);
	}

	return {
		plugins: [react()],
	};
});
