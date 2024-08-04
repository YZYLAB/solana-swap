# Solana Swap by Solana Tracker

Easiest way to add Solana based swaps to your project.
Uses the Solana Swap api from [https://docs.solanatracker.io](https://docs.solanatracker.io)

## Update July 12
You can now use "auto" on amount to automatically set the amount to the Balance of that token in the wallet. Only for Swap not for Rate endpoints!  Jito has been added to the library with example below. 

## UPDATE - July 9: Swap API has been updated, way faster and supporting new markets!

## Now supporting
- Raydium
- Raydium CPMM
- Pump.fun
- Moonshot
- Orca
- Jupiter (Private Self Hosted API)

## Example Projects
Volume Bot: [https://github.com/YZYLAB/solana-volume-bot](https://github.com/YZYLAB/solana-volume-bot)
Trading Bot: [https://github.com/YZYLAB/solana-trade-bot](https://github.com/YZYLAB/solana-trade-bot)
More coming soon

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
import { SolanaTracker } from "../";

async function swap() {
  const keypair = Keypair.fromSecretKey(
    bs58.decode(
      "YOUR_SECRET_KEY_HERE"
    )
  );
  const solanaTracker = new SolanaTracker(
    keypair,
    "https://rpc.solanatracker.io/public?advancedTx=true"
  );

  const swapResponse = await solanaTracker.getSwapInstructions(
    "So11111111111111111111111111111111111111112", // From Token
    "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", // To Token
    0.0001, // Amount to swap
    30, // Slippage
    keypair.publicKey.toBase58(), // Payer public key
    0.0005, // Priority fee (Recommended while network is congested)
  );

  // Regular transaction
  try {
    const txid = await solanaTracker.performSwap(swapResponse, {
      sendOptions: { skipPreflight: true },
      confirmationRetries: 30,
      confirmationRetryTimeout: 500,
      lastValidBlockHeightBuffer: 150,
      resendInterval: 1000,
      confirmationCheckInterval: 1000,
      commitment: "processed",
      skipConfirmationCheck: false // Set to true if you want to skip confirmation checks and return txid immediately
    });
    // Returns txid when the swap is successful or throws an error if the swap fails
    console.log("Transaction ID:", txid);
    console.log("Transaction URL:", `https://solscan.io/tx/${txid}`);
  } catch (error: any) {
    const {signature, message} = error;
    console.error("Error performing swap:", message, signature);
  }

  // Jito transaction
  try {
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
    // Returns txid when the swap is successful or throws an error if the swap fails
    console.log("Transaction ID:", txid);
    console.log("Transaction URL:", `https://solscan.io/tx/${txid}`);
  } catch (error: any) {
    const {signature, message} = error;
    console.error("Error performing swap:", message, signature);
  }
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

We charge a 0.5% fee on each successful transaction
.
Using this for a bot or site with a high processing volume?
Contact us via Discord or email (swap-api@solanatracker.io) and get the fee reduced (down to 0.1% only if accepted.)
