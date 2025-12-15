import { useState } from "react";
import {
	useAccount,
	useConnect,
	useConnectors,
	useDisconnect,
	useReadContract,
	useSwitchChain,
	useWaitForTransactionReceipt,
	useWriteContract,
} from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";

// Config from environment - per chain (validated at build time in vite.config.ts)
const config = {
	[mainnet.id]: {
		registrar: import.meta.env.VITE_MAINNET_REGISTRAR as `0x${string}`,
		resolver: import.meta.env.VITE_MAINNET_RESOLVER as `0x${string}`,
		parentName: import.meta.env.VITE_MAINNET_PARENT_NAME as string,
	},
	[sepolia.id]: {
		registrar: import.meta.env.VITE_SEPOLIA_REGISTRAR as `0x${string}`,
		resolver: import.meta.env.VITE_SEPOLIA_RESOLVER as `0x${string}`,
		parentName: import.meta.env.VITE_SEPOLIA_PARENT_NAME as string,
	},
} as const;

const resolverAbi = [
	{
		name: "reverseNode",
		type: "function",
		stateMutability: "pure",
		inputs: [{ name: "addr", type: "address" }],
		outputs: [{ type: "bytes32" }],
	},
	{
		name: "setText",
		type: "function",
		stateMutability: "nonpayable",
		inputs: [
			{ name: "node", type: "bytes32" },
			{ name: "key", type: "string" },
			{ name: "value", type: "string" },
		],
		outputs: [],
	},
	{
		name: "text",
		type: "function",
		stateMutability: "view",
		inputs: [
			{ name: "node", type: "bytes32" },
			{ name: "key", type: "string" },
		],
		outputs: [{ type: "string" }],
	},
] as const;

function App() {
	const { address, isConnected, chainId } = useAccount();
	const { connect } = useConnect();
	const connectors = useConnectors();
	const { disconnect } = useDisconnect();
	const { switchChain } = useSwitchChain();

	const [textKey, setTextKey] = useState("url");
	const [textValue, setTextValue] = useState("");
	const [readKey, setReadKey] = useState("url");
	const [readAddress, setReadAddress] = useState("");
	const [submittedRead, setSubmittedRead] = useState<{
		address: `0x${string}`;
		key: string;
	} | null>(null);

	// Get config for current chain
	const chainConfig = chainId ? config[chainId as keyof typeof config] : null;
	const resolver = chainConfig?.resolver;
	const parentName = chainConfig?.parentName;
	const isSupported = !!chainConfig;

	// Compute subname from address
	const subname =
		address && parentName
			? `${address.slice(2).toLowerCase()}.${parentName}`
			: null;

	// Get user's reverse node (for authorization)
	const { data: userNode } = useReadContract({
		address: resolver,
		abi: resolverAbi,
		functionName: "reverseNode",
		args: address ? [address] : undefined,
		query: { enabled: !!address && isSupported },
	});

	// Get reverse node for submitted read address
	const { data: readNode } = useReadContract({
		address: resolver,
		abi: resolverAbi,
		functionName: "reverseNode",
		args: submittedRead ? [submittedRead.address] : undefined,
		query: { enabled: !!submittedRead && isSupported },
	});

	// Read text record (only when submitted)
	const { data: textRecord } = useReadContract({
		address: resolver,
		abi: resolverAbi,
		functionName: "text",
		args: readNode && submittedRead ? [readNode, submittedRead.key] : undefined,
		query: { enabled: !!readNode && !!submittedRead && isSupported },
	});

	// Set text
	const {
		writeContract: setText,
		data: setTextHash,
		isPending: isSettingText,
	} = useWriteContract();
	const { isLoading: isSetTextConfirming, isSuccess: isSetTextConfirmed } =
		useWaitForTransactionReceipt({
			hash: setTextHash,
		});

	const handleSetText = () => {
		if (!userNode || !resolver) return;
		setText({
			address: resolver,
			abi: resolverAbi,
			functionName: "setText",
			args: [userNode, textKey, textValue],
		});
	};

	if (!isConnected) {
		return (
			<div>
				<h1>eth-config</h1>
				<p>Connect wallet to manage your ETH config</p>
				{connectors.map((connector) => (
					<button
						type="button"
						key={connector.uid}
						onClick={() => connect({ connector })}
					>
						{connector.name}
					</button>
				))}
			</div>
		);
	}

	if (!isSupported) {
		return (
			<div>
				<h1>ETH Config</h1>
				<p>
					<strong>Address:</strong> {address}
				</p>
				<p>
					<strong>Chain:</strong> {chainId} (not supported)
				</p>
				<p>Please switch to a supported network:</p>
				<div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
					<button
						type="button"
						onClick={() => switchChain({ chainId: mainnet.id })}
					>
						Switch to Mainnet
					</button>
					<button
						type="button"
						onClick={() => switchChain({ chainId: sepolia.id })}
					>
						Switch to Sepolia
					</button>
				</div>
				<button type="button" onClick={() => disconnect()}>
					Disconnect
				</button>
			</div>
		);
	}

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "row",
				gap: "2rem",
				flexWrap: "wrap",
			}}
		>
			<div style={{ flex: "1 1 300px" }}>
				<h1>ETH Config</h1>

				<div>
					<p>
						<strong>Address:</strong> {address}
					</p>
					<p>
						<strong>Chain:</strong>{" "}
						{chainId === mainnet.id ? "Mainnet" : "Sepolia"}
					</p>
					<div style={{ display: "flex", gap: "0.5rem" }}>
						<button
							type="button"
							onClick={() =>
								switchChain({
									chainId: chainId === mainnet.id ? sepolia.id : mainnet.id,
								})
							}
						>
							Switch to {chainId === mainnet.id ? "Sepolia" : "Mainnet"}
						</button>
						<button type="button" onClick={() => disconnect()}>
							Disconnect
						</button>
					</div>
				</div>

				<hr />

				<div>
					<h2>Set Text Record</h2>
					<div>
						<input
							placeholder="key (e.g. url)"
							value={textKey}
							onChange={(e) => setTextKey(e.target.value)}
						/>
						<input
							placeholder="value"
							value={textValue}
							onChange={(e) => setTextValue(e.target.value)}
						/>
						<button
							type="button"
							onClick={handleSetText}
							disabled={isSettingText || isSetTextConfirming}
						>
							{isSettingText
								? "Confirming..."
								: isSetTextConfirming
									? "Waiting..."
									: "Set"}
						</button>
						{isSetTextConfirmed && <p>Set! ✓</p>}
					</div>
				</div>

				<hr />

				<div>
					<h2>Read Text Record</h2>
					<div>
						<input
							placeholder={address}
							value={readAddress}
							onChange={(e) => setReadAddress(e.target.value)}
						/>
						<input
							placeholder="key (e.g. url)"
							value={readKey}
							onChange={(e) => setReadKey(e.target.value)}
						/>
						<button
							type="button"
							onClick={() =>
								setSubmittedRead({
									address: (readAddress || address) as `0x${string}`,
									key: readKey,
								})
							}
						>
							Read
						</button>
					</div>
					{submittedRead && (
						<p>
							<strong>{submittedRead.key}:</strong> {textRecord || "(empty)"}
						</p>
					)}
				</div>

				<hr />

				<div>
					<h2>Your ENS Name</h2>
					<p>
						<strong>{subname}</strong>
					</p>
					<p>
						Your config is automatically available at this ENS name via wildcard
						resolution. Any records you set above can be looked up by other apps
						using this name.
					</p>
				</div>
			</div>

			<div style={{ flex: "0 0 300px" }}>
				<h2>Dev</h2>
				<p>
					Contract address on {chainId === sepolia.id ? "Sepolia" : "Mainnet"}.
					Your app can integrate ETH config by reading and writing records to
					the resolver contract.
				</p>
				<p>
					<strong>Resolver:</strong>{" "}
					<a
						href={`https://${chainId === sepolia.id ? "sepolia." : ""}etherscan.io/address/${resolver}`}
						target="_blank"
						rel="noopener noreferrer"
					>
						{resolver}
					</a>
				</p>
				<p>
					<strong>ABI:</strong>
				</p>
				<pre style={{ overflow: "auto", fontSize: "12px" }}>
					{JSON.stringify(resolverAbi, null, 2)}
				</pre>
			</div>
		</div>
	);
}

export default App;
