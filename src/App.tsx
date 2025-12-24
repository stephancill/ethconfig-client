import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { type Address, createPublicClient, http } from "viem";
import { normalize } from "viem/ens";
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
import { baseSepolia, sepolia } from "wagmi/chains";

// Config from environment
const PARENT_NAME = import.meta.env.VITE_PARENT_NAME as string;

// ABIs
const l1ConfigResolverAbi = [
	{
		name: "l2ChainId",
		type: "function",
		stateMutability: "view",
		inputs: [],
		outputs: [{ type: "uint256" }],
	},
	{
		name: "l2ConfigResolver",
		type: "function",
		stateMutability: "view",
		inputs: [],
		outputs: [{ type: "address" }],
	},
] as const;

const configResolverAbi = [
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

// Public client for ENS resolution on mainnet
const testnetClient = createPublicClient({
	chain: sepolia,
	transport: http(),
});

const AlphaBanner = () => (
	<div
		style={{
			background: "linear-gradient(90deg, #f59e0b, #d97706)",
			color: "#000",
			padding: "0.75rem 1rem",
			textAlign: "center",
			fontWeight: 500,
			fontSize: "0.9rem",
			marginBottom: "1rem",
		}}
	>
		⚠️ Alpha version (Testnet only) – Contact{" "}
		<a
			href="https://x.com/stephancill"
			target="_blank"
			rel="noopener noreferrer"
			style={{ color: "#000", textDecoration: "underline" }}
		>
			@stephancill on X
		</a>{" "}
		or{" "}
		<a
			href="https://farcaster.xyz/stephancill"
			target="_blank"
			rel="noopener noreferrer"
			style={{ color: "#000", textDecoration: "underline" }}
		>
			Farcaster
		</a>{" "}
		if you're interested in building on this standard
	</div>
);

function App() {
	const { address, isConnected, chainId } = useAccount();
	const { connect } = useConnect();
	const connectors = useConnectors();
	const { disconnect } = useDisconnect();
	const { switchChain } = useSwitchChain();

	// Form state
	const [textKey, setTextKey] = useState("url");
	const [textValue, setTextValue] = useState("");
	const [readKey, setReadKey] = useState("url");
	const [readAddress, setReadAddress] = useState("");
	const [submittedRead, setSubmittedRead] = useState<{
		address: Address;
		key: string;
	} | null>(null);

	// ENS resolution state
	const [ensName, setEnsName] = useState("");
	const [ensKey, setEnsKey] = useState("url");
	const [ensResult, setEnsResult] = useState<string | null>(null);
	const [ensLoading, setEnsLoading] = useState(false);
	const [ensError, setEnsError] = useState<string | null>(null);

	// Get L1ConfigResolver address from ENS
	const { data: l1ConfigResolver, isLoading: isLoadingResolver } = useQuery({
		queryKey: ["ensResolver", PARENT_NAME],
		queryFn: async () => {
			if (!PARENT_NAME) return null;
			const resolver = await testnetClient.getEnsResolver({
				name: normalize(PARENT_NAME),
			});
			return resolver;
		},
		enabled: !!PARENT_NAME,
		staleTime: 1000 * 60 * 5, // Cache for 5 minutes
	});

	// Read L2 config from L1ConfigResolver (on Sepolia)
	const { data: l2ChainId } = useReadContract({
		address: l1ConfigResolver as Address | undefined,
		abi: l1ConfigResolverAbi,
		functionName: "l2ChainId",
		chainId: sepolia.id,
		query: { enabled: !!l1ConfigResolver },
	});

	const { data: l2ConfigResolver } = useReadContract({
		address: l1ConfigResolver as Address | undefined,
		abi: l1ConfigResolverAbi,
		functionName: "l2ConfigResolver",
		chainId: sepolia.id,
		query: { enabled: !!l1ConfigResolver },
	});

	// Determine if we're on the correct L2 chain
	const isOnL2 = chainId === baseSepolia.id;

	// Compute subname from address
	const subname = address && PARENT_NAME ? `${address}.${PARENT_NAME}` : null;

	// Get user's reverse node on L2 (for authorization)
	const { data: userNode } = useReadContract({
		address: l2ConfigResolver,
		abi: configResolverAbi,
		functionName: "reverseNode",
		args: address ? [address] : undefined,
		chainId: baseSepolia.id,
		query: { enabled: !!address && !!l2ConfigResolver },
	});

	// Get reverse node for submitted read address on L2
	const { data: readNode } = useReadContract({
		address: l2ConfigResolver,
		abi: configResolverAbi,
		functionName: "reverseNode",
		args: submittedRead ? [submittedRead.address] : undefined,
		chainId: baseSepolia.id,
		query: { enabled: !!submittedRead && !!l2ConfigResolver },
	});

	// Read text record from L2 ConfigResolver
	const { data: textRecord, refetch: refetchTextRecord } = useReadContract({
		address: l2ConfigResolver,
		abi: configResolverAbi,
		functionName: "text",
		args: readNode && submittedRead ? [readNode, submittedRead.key] : undefined,
		chainId: baseSepolia.id,
		query: { enabled: !!readNode && !!submittedRead && !!l2ConfigResolver },
	});

	// Set text on L2 ConfigResolver
	const {
		writeContract: setText,
		data: setTextHash,
		isPending: isSettingText,
		error: setTextError,
	} = useWriteContract();

	const { isLoading: isSetTextConfirming, isSuccess: isSetTextConfirmed } =
		useWaitForTransactionReceipt({
			hash: setTextHash,
		});

	const handleSetText = () => {
		if (!userNode || !l2ConfigResolver) return;
		setText({
			address: l2ConfigResolver,
			abi: configResolverAbi,
			functionName: "setText",
			args: [userNode, textKey, textValue],
			chainId: baseSepolia.id,
		});
	};

	// ENS resolution using viem
	const handleEnsLookup = async () => {
		if (!ensName) return;
		setEnsLoading(true);
		setEnsError(null);
		setEnsResult(null);

		try {
			const normalizedName = normalize(ensName);
			const result = await testnetClient.getEnsText({
				name: normalizedName,
				key: ensKey,
			});
			console.log("result", result);
			setEnsResult(result);
		} catch (err) {
			setEnsError(err instanceof Error ? err.message : "Failed to resolve ENS");
		} finally {
			setEnsLoading(false);
		}
	};

	if (!isConnected) {
		return (
			<>
				<AlphaBanner />
				<div>
					<h1>eth-config</h1>
					<p>Connect wallet to manage your ETH config on testnet</p>
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
			</>
		);
	}

	return (
		<>
			<AlphaBanner />
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					gap: "2rem",
					flexWrap: "wrap",
				}}
			>
				<div style={{ flex: "1 1 300px" }}>
					<h1>ETH Config (Testnet)</h1>

					<div>
						<p>
							<strong>Address:</strong> {address}
						</p>
						<p>
							<strong>Chain:</strong>{" "}
							{chainId === sepolia.id
								? "Sepolia (L1)"
								: chainId === baseSepolia.id
									? "Base Sepolia (L2)"
									: `Unknown (${chainId})`}
						</p>
						<p>
							<strong>L2 Config:</strong>{" "}
							{isLoadingResolver ? (
								"Fetching resolver..."
							) : l2ConfigResolver ? (
								<>
									Chain {l2ChainId?.toString()} at{" "}
									<code>{l2ConfigResolver}</code>
								</>
							) : (
								"Loading..."
							)}
						</p>
						<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
							{!isOnL2 && (
								<button
									type="button"
									onClick={() => switchChain({ chainId: baseSepolia.id })}
								>
									Switch to Base Sepolia (L2)
								</button>
							)}
							{isOnL2 && (
								<button
									type="button"
									onClick={() => switchChain({ chainId: sepolia.id })}
								>
									Switch to Sepolia (L1)
								</button>
							)}
							<button type="button" onClick={() => disconnect()}>
								Disconnect
							</button>
						</div>
					</div>

					<hr />

					<div>
						<h2>Set Text Record (L2)</h2>
						{!isOnL2 && (
							<p style={{ color: "#f59e0b" }}>
								⚠️ Switch to Base Sepolia to set records
							</p>
						)}
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
								disabled={!isOnL2 || isSettingText || isSetTextConfirming}
							>
								{isSettingText
									? "Confirming..."
									: isSetTextConfirming
										? "Waiting..."
										: "Set"}
							</button>
							{isSetTextConfirmed && <p style={{ color: "green" }}>Set! ✓</p>}
							{setTextError && (
								<p style={{ color: "red" }}>
									Error: {setTextError.message.slice(0, 100)}
								</p>
							)}
						</div>
					</div>

					<hr />

					<div>
						<h2>Read Text Record (L2)</h2>
						<p style={{ fontSize: "0.9rem", color: "#888" }}>
							Reads directly from L2 ConfigResolver
						</p>
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
								onClick={() => {
									setSubmittedRead({
										address: (readAddress || address) as Address,
										key: readKey,
									});
									refetchTextRecord();
								}}
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
							Your config is automatically available at this ENS name via
							wildcard resolution. Any records you set above can be looked up by
							other apps using this name through CCIP-Read.
						</p>
					</div>
				</div>

				<div style={{ flex: "1 1 300px" }}>
					<h2>ENS Text Lookup (Mainnet)</h2>
					<p style={{ fontSize: "0.9rem", color: "#888" }}>
						Use viem's getEnsText to resolve any ENS name's text records
					</p>
					<div>
						<input
							placeholder="ENS name (e.g. vitalik.eth)"
							value={ensName}
							onChange={(e) => setEnsName(e.target.value)}
							style={{ width: "100%" }}
						/>
						<input
							placeholder="key (e.g. url, avatar, com.twitter)"
							value={ensKey}
							onChange={(e) => setEnsKey(e.target.value)}
							style={{ width: "100%" }}
						/>
						<button
							type="button"
							onClick={handleEnsLookup}
							disabled={ensLoading || !ensName}
						>
							{ensLoading ? "Loading..." : "Lookup"}
						</button>
					</div>
					{ensResult !== null && (
						<p>
							<strong>Result:</strong> {ensResult || "(empty)"}
						</p>
					)}
					{ensError && <p style={{ color: "red" }}>Error: {ensError}</p>}

					<hr />

					<h2>Dev</h2>
					<p>
						Contract addresses on testnet. Your app can integrate ETH config by
						reading and writing records to the resolver contract.
					</p>
					<p>
						<strong>GitHub:</strong>{" "}
						<a
							href="https://github.com/stephancill/eth-config-resolver"
							target="_blank"
							rel="noopener noreferrer"
						>
							resolver
						</a>
						{" | "}
						<a
							href="https://github.com/stephancill/ethconfig-client"
							target="_blank"
							rel="noopener noreferrer"
						>
							client
						</a>
					</p>
					{l1ConfigResolver && (
						<p>
							<strong>L1 Resolver (Sepolia):</strong>{" "}
							<a
								href={`https://sepolia.etherscan.io/address/${l1ConfigResolver}`}
								target="_blank"
								rel="noopener noreferrer"
							>
								{l1ConfigResolver}
							</a>
						</p>
					)}
					{l2ConfigResolver && (
						<p>
							<strong>L2 Resolver (Base Sepolia):</strong>{" "}
							<a
								href={`https://sepolia.basescan.org/address/${l2ConfigResolver}`}
								target="_blank"
								rel="noopener noreferrer"
							>
								{l2ConfigResolver}
							</a>
						</p>
					)}
					<p>
						<strong>ConfigResolver ABI:</strong>
					</p>
					<pre style={{ overflow: "auto", fontSize: "12px" }}>
						{JSON.stringify(configResolverAbi, null, 2)}
					</pre>
				</div>
			</div>
		</>
	);
}

export default App;
