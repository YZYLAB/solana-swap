# Solana Swap by Solana Tracker

Easiest way to add Solana based swaps to your project.
Uses the Solana Swap api from [https://docs.solanatracker.io](https://docs.solanatracker.io)

## Now supporting

- Raydium
- Pump.fun
- Jupiter

## Installation

Install Solana Swap with NPM

```bash
  npm install solana-swap
```

Or

```bash
git clone https://github.com/YZYLAB/solana-swap.git
```

## Demo

Swap API is used live on:
https://www.solanatracker.io

_Add your site here_

## Example Usage

```javascript
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { SolanaTracker } from "solana-swap";

async function swap() {
  const keypair = Keypair.fromSecretKey(bs58.decode("YOUR_SECRET_KEY_HERE"));
  const solanaTracker = new SolanaTracker(
    keypair,
    "https://rpc.solanatracker.io/public?advancedTx=true" // YOUR RPC URL
  );

  const swapResponse = await solanaTracker.getSwapInstructions(
    "So11111111111111111111111111111111111111112", // From Token
    "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", // To Token
    0.0005, // Amount to swap
    30, // Slippage
    keypair.publicKey.toBase58(), // Payer public key
    0.00005, // Priority fee (Recommended while network is congested)
    true // Force legacy transaction for Jupiter
  );

  const txid = await solanaTracker.performSwap(swapResponse, {
    sendOptions: { skipPreflight: true },
    confirmationRetries: 30,
    confirmationRetryTimeout: 1000,
    lastValidBlockHeightBuffer: 150,
    resendInterval: 1000,
    confirmationCheckInterval: 1000,
    skipConfirmationCheck: false, // Set to true if you want to skip confirmation checks and return txid immediately
    commitment: "confirmed"
  });
  // Returns txid when the swap is successful or throws an error if the swap fails
  console.log("Transaction ID:", txid);
  console.log("Transaction URL:", `https://solscan.io/tx/${txid}`);
}

swap();
```

ES5 Example Import

```javascript
const { SolanaTracker } = require("solana-swap")
```

## FAQ

#### Why should I use this API?

We retrieve all Solana (raydium, pumpfun, etc) tokens the second they are available, so you can perform fast snipes.
We also provide our own hosted Jupiter Swap API with no rate limits and faster market updates.

#### Is there a fee for using this API?

We charge a 0.9% fee on each successful transaction
.
Using this for a public bot or site with a high processing volume?
Contact us via Discord or email (swap-api@solanatracker.io) and get the fee reduced to 0.1% (only if accepted.)
