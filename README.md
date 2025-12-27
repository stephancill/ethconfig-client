# ETH Config Client

A client for reading from and writing to ethconfig.eth.

## Overview

ETH Config lets you store configuration data on Ethereum using ENS. Your config is automatically available at `<your-address>.ethconfig.eth` via wildcard resolution.

## Features

- **Set text records** - Store key-value pairs (URLs, descriptions, etc.)
- **Read records** - Look up any address's config
- **Dynamic resolution** - Use `resolve:<url>` to fetch config values from external URLs
- **No claiming required** - Start using immediately with your wallet
- **Works with any ENS-compatible app** - Your config resolves at `<address>.ethconfig.eth`

## Dynamic Resolution

Text record values that start with `resolve:` followed by a URL will be fetched and the response displayed. This allows you to host dynamic configuration externally while still using ENS as the discovery layer.

### Example

Set a text record:
```
key: config
value: resolve:https://example.com/my-config.json
```

When looked up, the client will fetch `https://example.com/my-config.json` and display its contents.

### Authentication

If the URL returns a 401 or 403 status, the client will display "(requires authentication)" and show the URL for manual access.

## How It Works

1. Connect your wallet
2. Set a text record (e.g., `url` → `https://example.com`)
3. Your config is now resolvable at `<your-address>.ethconfig.eth`

Other apps can look up your config using standard ENS resolution.

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
VITE_PARENT_NAME=ethconfig.eth
```

## Contracts

See [eth-config-resolver](https://github.com/stephancill/eth-config-resolver) for the smart contracts that power this system:

- **ConfigResolver** - ENS resolver for storing text, address, and other records
- **AddressSubnameRegistrar** - Enables claiming `<address>.ethconfig.eth` subnames

## License

MIT
