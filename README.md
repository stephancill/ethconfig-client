# ETH Config Client

A simple client for reading from and writing to ethconfig.eth.

## Overview

ETH Config lets you store configuration data on Ethereum using ENS. Your config is automatically available at `<your-address>.ethconfig.eth` via wildcard resolution.

## Features

- **Set text records** - Store key-value pairs (URLs, descriptions, etc.)
- **Read records** - Look up any address's config
- **No claiming required** - Start using immediately with your wallet
- **Works with any ENS-compatible app** - Your config resolves at `<address>.ethconfig.eth`

## Development

### Install

```bash
pnpm install
```

### Run

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

## Environment Variables

Create a `.env` file with:

```env
# Mainnet
VITE_MAINNET_REGISTRAR=0x...
VITE_MAINNET_RESOLVER=0x...
VITE_MAINNET_PARENT_NAME=ethconfig.eth

# Sepolia (optional)
VITE_SEPOLIA_REGISTRAR=0x...
VITE_SEPOLIA_RESOLVER=0x...
VITE_SEPOLIA_PARENT_NAME=ethconfig.eth
```

## How It Works

1. Connect your wallet
2. Set a text record (e.g., `url` → `https://example.com`)
3. Your config is now resolvable at `<your-address>.ethconfig.eth`

Other apps can look up your config using standard ENS resolution.

## Contracts

See [ens-config-resolver](../ens-config-resolver) for the smart contracts.

## License

MIT
