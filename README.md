# Solana Swap

> The most efficient solution for integrating Solana-based token swaps into your projects.

![Solana Swap](https://img.shields.io/npm/v/solana-swap)
![License](https://img.shields.io/npm/l/solana-swap)
![Downloads](https://img.shields.io/npm/dm/solana-swap)

## Overview

Solana Swap provides a streamlined API for executing token swaps on the Solana blockchain. Built and maintained by [Solana Tracker](https://www.solanatracker.io), this library offers fast market updates and comprehensive access to multiple Solana DEXs through a unified interface.

## Features

- **Fast Market Updates**: Fastest Solana swap api available.
- **Multi-DEX Support**: Integrated with major Solana DEXs
- **High Performance**: Optimized for speed and reliability, even during network congestion
- **Developer-Friendly**: Simple interface with comprehensive documentation
- **Jito Integration**: Support for Jito bundles for MEV protection
- **Auto Priority Fees**: Automatic priority fee calculation
- **Custom Fee Support**: Add your own fees on swaps
- **Percentage-based Swaps**: Swap percentages of wallet balance

## Supported DEXs

- Raydium
- Raydium CPMM
- Pump.fun
- Pump.fun CLMM
- Meteora Dynamic
- Moonshot
- Orca 
- Jupiter (Private Self-Hosted API)

## Installation

```bash
# Using npm
npm install solana-swap

# Using yarn
yarn add solana-swap

# Using pnpm
pnpm add solana-swap
```

Or clone the repository:

```bash
git clone https://github.com/YZYLAB/solana-swap.git
```

## Quick Start

```javascript
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { SolanaTracker } from "solana-swap";

async function swap() {
  // Initialize wallet
  const keypair = Keypair.fromSecretKey(
    bs58.decode("YOUR_SECRET_KEY_HERE")
  );
  
  // Create instance with RPC endpoint
  const solanaTracker = new SolanaTracker(
    keypair,
    "https://rpc.solanatracker.io/public?advancedTx=true"
  );
  
  // Get swap instructions
  const swapResponse = await solanaTracker.getSwapInstructions(
    "So11111111111111111111111111111111111111112", // From Token (SOL)
    "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", // To Token
    0.0001,                                         // Amount to swap
    30,                                            // Slippage (%)
    keypair.publicKey.toBase58(),                  // Payer public key
    0.0005,                                        // Priority fee
  );
  
  // Execute the swap
  try {
    const txid = await solanaTracker.performSwap(swapResponse, {
      sendOptions: { skipPreflight: true },
      confirmationRetries: 30,
      confirmationRetryTimeout: 500,
      lastValidBlockHeightBuffer: 150,
      resendInterval: 1000,
      confirmationCheckInterval: 1000,
      commitment: "processed",
      skipConfirmationCheck: false // Set to true to return txid immediately
    });
    
    console.log("Transaction ID:", txid);
    console.log("Transaction URL:", `https://solscan.io/tx/${txid}`);
  } catch (error) {
    const {signature, message} = error;
    console.error("Error performing swap:", message, signature);
  }
}

swap();
```

## Advanced Features

### Auto Amount

Use `"auto"` to swap the entire balance of a token:

```javascript
const swapResponse = await solanaTracker.getSwapInstructions(
  fromToken,
  toToken,
  "auto",  // Uses entire balance
  slippage,
  payerPublicKey,
  priorityFee
);
```

### Percentage-based Swaps

Swap a percentage of your wallet balance:

```javascript
const swapResponse = await solanaTracker.getSwapInstructions(
  fromToken,
  toToken,
  "50%",  // Swap 50% of balance
  slippage,
  payerPublicKey,
  priorityFee
);
```

### Auto Priority Fees

Let the API automatically determine the optimal priority fee:

```javascript
const swapResponse = await solanaTracker.getSwapInstructions(
  fromToken,
  toToken,
  amount,
  slippage,
  payerPublicKey,
  "auto",  // Auto priority fee
  false,   // forceLegacy
  {
    priorityFeeLevel: "medium"  // Options: "min", "low", "medium", "high", "veryHigh", "unsafeMax"
  }
);
```

### Custom Fees

Add your own fees to swaps:

```javascript
const swapResponse = await solanaTracker.getSwapInstructions(
  fromToken,
  toToken,
  amount,
  slippage,
  payerPublicKey,
  priorityFee,
  false,
  {
    fee: {
      wallet: "YOUR_FEE_WALLET_ADDRESS",
      percentage: 0.25  // 0.25% fee
    },
    feeType: "add"  // "add" or "deduct"
  }
);
```

### Transaction Versions

Choose between versioned transactions (v0) or legacy transactions:

```javascript
const swapResponse = await solanaTracker.getSwapInstructions(
  fromToken,
  toToken,
  amount,
  slippage,
  payerPublicKey,
  priorityFee,
  false,
  {
    txVersion: "v0"  // or "legacy"
  }
);
```

### Direct Routes Only

Disable multi-hop swaps for direct pool routes only:

```javascript
const swapResponse = await solanaTracker.getSwapInstructions(
  fromToken,
  toToken,
  amount,
  slippage,
  payerPublicKey,
  priorityFee,
  false,
  {
    onlyDirectRoutes: true
  }
);
```

### Jito Integration

Execute transactions with Jito bundles for MEV protection:

```javascript
const txid = await solanaTracker.performSwap(swapResponse, {
  sendOptions: { skipPreflight: true },
  confirmationRetries: 30,
  confirmationCheckInterval: 500,
  commitment: "processed",
  jito: {
    enabled: true,
    tip: 0.0001,
  },
});
```

## Full Example with All Features

```javascript
// Swap 50% of wallet balance with auto priority fee and custom fee
const swapResponse = await solanaTracker.getSwapInstructions(
  "So11111111111111111111111111111111111111112",
  "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
  "50%",
  30,
  keypair.publicKey.toBase58(),
  "auto",
  false,
  {
    priorityFeeLevel: "high",
    fee: {
      wallet: "YOUR_FEE_WALLET_ADDRESS",
      percentage: 0.5
    },
    feeType: "add",
    txVersion: "v0",
    onlyDirectRoutes: false
  }
);
```

## API Reference

### getSwapInstructions

```typescript
getSwapInstructions(
  from: string,                           // From token address
  to: string,                             // To token address
  fromAmount: number | string,            // Amount ("auto", "50%", or number)
  slippage: number,                       // Slippage percentage
  payer: string,                          // Payer public key
  priorityFee?: number | "auto",          // Priority fee
  forceLegacy?: boolean,                  // Force legacy transaction
  additionalOptions?: {                   // Additional options
    priorityFeeLevel?: "min" | "low" | "medium" | "high" | "veryHigh" | "unsafeMax",
    fee?: { wallet: string; percentage: number },
    feeType?: "add" | "deduct",
    txVersion?: "v0" | "legacy",
    onlyDirectRoutes?: boolean
  }
): Promise<SwapResponse>
```

## Example Projects

- [Volume Bot](https://github.com/YZYLAB/solana-volume-bot)
- [Trading Bot](https://github.com/YZYLAB/solana-trade-bot)


*Using this library in production? [Let us know](mailto:swap-api@solanatracker.io) to be featured here.*

## CommonJS Usage

For projects using CommonJS:

```javascript
const { SolanaTracker } = require("solana-swap");
```

## Pricing

Our standard fee is 0.5% on successful transactions. For high-volume applications, we offer discounted rates (as low as 0.1%) for qualified projects.

## Contact

For business inquiries or volume discounts:
- Email: [swap-api@solanatracker.io](mailto:swap-api@solanatracker.io)
- Discord: [Join our community](https://discord.gg/JH2e9rR9fc)

## Documentation

For full documentation, visit our [API Docs](https://docs.solanatracker.io).

## License

[MIT](LICENSE)