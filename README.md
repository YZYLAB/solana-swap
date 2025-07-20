
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
- **Custom Send Endpoints**: Support for specialized RPC endpoints (Helius, Nextblock, etc.)
- **WebSocket Confirmations**: Efficient transaction confirmation via WebSocket
- **Detailed Error Handling**: Get comprehensive transaction error information
- **HTTP/HTTPS Support**: Works with both secure and local RPC endpoints
- **Connection Keep-Alive**: Maintains warm connections for better performance

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
    "https://rpc.solanatracker.io/public?advancedTx=true",
    "YOUR_API_KEY", // Optional: API key for swap instructions (Only available upon request for reduced fee, not required)
    false           // Optional: Enable debug mode
  );
  
  // Get swap instructions
  const swapResponse = await solanaTracker.getSwapInstructions(
    "So11111111111111111111111111111111111111112", // From Token (SOL)
    "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", // To Token
    0.0001,                                         // Amount to swap
    30,                                            // Slippage (% or "auto")
    keypair.publicKey.toBase58(),                  // Payer public key
    0.0005,                                        // Priority fee (or "auto")
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
      skipConfirmationCheck: false, // Set to true to return txid immediately
      useWebSocket: true           // Use WebSocket for confirmation (more efficient)
    });
    
    console.log("Transaction ID:", txid);
    console.log("Transaction URL:", `https://solscan.io/tx/${txid}`);
  } catch (error) {
    console.error("Error performing swap:", error.message);
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

### Auto Slippage

Let the API automatically determine the optimal slippage:

```javascript
const swapResponse = await solanaTracker.getSwapInstructions(
  fromToken,
  toToken,
  amount,
  "auto",  // Auto slippage based on liquidity
  payerPublicKey,
  priorityFee
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

### Custom Tips

Add custom tips for services like Jito or validators:

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
    customTip: {
      wallet: "TIP_WALLET_ADDRESS",
      amount: 0.001  // 0.001 SOL tip
    }
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

### Custom Send Endpoints

Use specialized RPC endpoints for sending transactions:

```javascript
// Helius example
await solanaTracker.setCustomSendTransactionEndpoint(
  "https://ams-sender.helius-rpc.com/fast"
);

// Nextblock example with authentication
await solanaTracker.setCustomSendTransactionEndpoint(
  "https://london.nextblock.io",
  {
    'Authorization': 'YOUR_API_KEY'
  }
);

// Clear custom endpoint (go back to default)
await solanaTracker.setCustomSendTransactionEndpoint(null);
```

### WebSocket Confirmations

Use WebSocket for more efficient transaction confirmations:

```javascript
const txid = await solanaTracker.performSwap(swapResponse, {
  sendOptions: { skipPreflight: true },
  confirmationRetries: 30,
  confirmationRetryTimeout: 500,
  commitment: "processed",
  useWebSocket: true  // Enable WebSocket confirmation
});
```

### Detailed Error Information

Get comprehensive error details when transactions fail:

```javascript
const result = await solanaTracker.performSwapWithDetails(swapResponse, {
  sendOptions: { skipPreflight: true },
  confirmationRetries: 30,
  confirmationRetryTimeout: 500,
  commitment: "processed",
  useWebSocket: true
});

if (result.error) {
  console.error("Transaction failed:", result.signature);
  console.error("Error type:", result.error.type);
  console.error("Error message:", result.error.message);
  if (result.error.programId) {
    console.error("Program that failed:", result.error.programId);
  }
  if (result.error.instructionIndex !== undefined) {
    console.error("Instruction index:", result.error.instructionIndex);
  }
} else {
  console.log("Transaction successful:", result.signature);
}
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

### Debug Mode

Enable debug logging for troubleshooting:

```javascript
// Enable globally
const solanaTracker = new SolanaTracker(keypair, rpc, apiKey, true);

// Or per operation
const txid = await solanaTracker.performSwap(swapResponse, {
  debug: true,
  // ... other options
});

// Or toggle at runtime
solanaTracker.setDebug(true);
```

## Full Example with All Features

```javascript
// Initialize with all options
const solanaTracker = new SolanaTracker(
  keypair,
  "https://api.mainnet-beta.solana.com",
  "YOUR_API_KEY",
  true // debug mode
);

// Set custom send endpoint
await solanaTracker.setCustomSendTransactionEndpoint(
  "https://mainnet.block-engine.jito.wtf/api/v1/transactions",
  { 'Authorization': 'Bearer YOUR_TOKEN' }
);

// Swap 50% of wallet balance with all features
const swapResponse = await solanaTracker.getSwapInstructions(
  "So11111111111111111111111111111111111111112",
  "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
  "50%",
  "auto", // Auto slippage
  keypair.publicKey.toBase58(),
  "auto", // Auto priority fee
  false,
  {
    priorityFeeLevel: "high",
    fee: {
      wallet: "YOUR_FEE_WALLET_ADDRESS",
      percentage: 0.5
    },
    customTip: {
      wallet: "TIP_WALLET_ADDRESS",
      amount: 0.001
    },
    feeType: "add",
    txVersion: "v0",
    onlyDirectRoutes: false
  }
);

// Execute with detailed error handling
const result = await solanaTracker.performSwapWithDetails(swapResponse, {
  sendOptions: { skipPreflight: true },
  confirmationRetries: 30,
  confirmationRetryTimeout: 500,
  commitment: "processed",
  useWebSocket: true
});

if (result.error) {
  console.error("Swap failed:", result.error);
} else {
  console.log("Swap successful:", result.signature);
}

// Clean up
solanaTracker.destroy();
```

## API Reference

### Constructor

```typescript
new SolanaTracker(
  keypair: Keypair,           // Wallet keypair
  rpc: string,                // RPC endpoint (HTTP or HTTPS)
  apiKey?: string,            // Optional API key
  debug?: boolean             // Enable debug logging
)
```

### getSwapInstructions

```typescript
getSwapInstructions(
  from: string,                           // From token address
  to: string,                             // To token address
  fromAmount: number | string | "auto",   // Amount ("auto", "50%", or number)
  slippage: number | "auto",              // Slippage percentage or auto
  payer: string,                          // Payer public key
  priorityFee?: number | "auto",          // Priority fee or auto
  forceLegacy?: boolean,                  // Force legacy transaction
  additionalOptions?: {                   // Additional options
    priorityFeeLevel?: "min" | "low" | "medium" | "high" | "veryHigh" | "unsafeMax",
    fee?: { wallet: string; percentage: number },
    customTip?: { wallet: string; amount: number },
    feeType?: "add" | "deduct",
    txVersion?: "v0" | "legacy",
    onlyDirectRoutes?: boolean
  }
): Promise<SwapResponse>
```

### performSwap

```typescript
performSwap(
  swapResponse: SwapResponse,
  options?: {
    sendOptions?: SendOptions,
    confirmationRetries?: number,
    confirmationRetryTimeout?: number,
    lastValidBlockHeightBuffer?: number,
    resendInterval?: number,
    confirmationCheckInterval?: number,
    commitment?: Commitment,
    skipConfirmationCheck?: boolean,
    useWebSocket?: boolean,              // Use WebSocket for confirmation
    debug?: boolean,                     // Enable debug for this operation
    jito?: {
      enabled: boolean,
      tip: number
    }
  }
): Promise<string>  // Returns transaction signature
```

### performSwapWithDetails

```typescript
performSwapWithDetails(
  swapResponse: SwapResponse,
  options?: PerformSwapOptions
): Promise<{
  signature: string;
  error?: {
    type: "InstructionError" | "InsufficientFunds" | "AccountNotFound" | "ProgramError" | "Unknown";
    message: string;
    instructionIndex?: number;
    programId?: string;
    rawError?: any;
  }
}>
```

### setCustomSendTransactionEndpoint

```typescript
setCustomSendTransactionEndpoint(
  endpoint: string | null,              // Custom RPC endpoint or null to clear
  headers?: Record<string, string>      // Optional headers for authentication
): Promise<void>
```

### Additional Methods

```typescript
// Update RPC endpoint
updateRpcEndpoint(rpc: string): void

// Get custom send endpoint
getCustomSendEndpoint(): string | null

// Set debug mode
setDebug(enabled: boolean): void

// Clean up resources
destroy(): void

// Get transaction details
getTransactionDetails(signature: string): Promise<ParsedTransactionWithMeta | null>

// Get current rate
getRate(
  from: string,
  to: string,
  amount: number | string | "auto",
  slippage: number | "auto"
): Promise<RateResponse>
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
