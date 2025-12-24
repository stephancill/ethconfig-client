import { createConfig, http } from "wagmi";
import { baseSepolia, sepolia } from "wagmi/chains";
import { baseAccount } from "wagmi/connectors";

export const config = createConfig({
	chains: [sepolia, baseSepolia],
	connectors: [baseAccount()],
	transports: {
		[sepolia.id]: http(),
		[baseSepolia.id]: http(),
	},
});

declare module "wagmi" {
	interface Register {
		config: typeof config;
	}
}
