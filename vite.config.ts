import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// Required environment variables for each chain
const requiredEnvVars = [
	"VITE_MAINNET_REGISTRAR",
	"VITE_MAINNET_RESOLVER",
	"VITE_MAINNET_PARENT_NAME",
	"VITE_SEPOLIA_REGISTRAR",
	"VITE_SEPOLIA_RESOLVER",
	"VITE_SEPOLIA_PARENT_NAME",
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
