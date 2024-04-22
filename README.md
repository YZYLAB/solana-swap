
# Solana Swap by Solana Tracker

Easiest way to add Solana based swaps to your project.
Uses the Solana Swap api from [https://docs.solanatracker.io](https://docs.solanatracker.io)

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

*Add your site here*


## Example Usage

```javascript
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import SolanaTracker from "solana-swap";

async function swap() {
  const keypair = Keypair.fromSecretKey(
    bs58.decode(
      "YOUR_SECRET_KEY_HERE"
    )
  );
  const solanaTracker = new SolanaTracker(
    keypair,
    "https://api.solanatracker.io/rpc" // YOUR RPC URL
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

  const txid = await solanaTracker.performSwap(swapResponse);
  // Returns txid when the swap is successful or throws an error if the swap fails
  console.log("Transaction ID:", txid);
  console.log("Transaction URL:", `https://explorer.solana.com/tx/${txid}`);
}

swap();
```

ES5 Example Import
```javascript
const SolanaTracker = require("solana-swap").default;
```


## FAQ

#### Why should I use this API?

We retrieve all raydium tokens the second they are available, so you can perform fast snipes.
We also provide our own hosted Jupiter Swap API with no rate limits and faster market updates.

#### Is there a fee for using this API?

We charge a 0.9% fee on each successful transaction.
