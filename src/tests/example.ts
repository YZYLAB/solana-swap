import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import SolanaTracker from "../";

async function swap() {
  const keypair = Keypair.fromSecretKey(
    bs58.decode(
      "YOUR_SECRET_KEY"
    )
  );
  const solanaTracker = new SolanaTracker(
    keypair,
    "https://api.solanatracker.io/rpc"
  );

  const swapResponse = await solanaTracker.getSwapInstructions(
    "So11111111111111111111111111111111111111112", // From Token
    "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", // To Token
    0.0005, // Amount to swap
    30, // Slippage
    keypair.publicKey.toBase58(), // Payer public key
    0.0005 // Priority fee (Recommended while network is congested)
  ); 

  const txid = await solanaTracker.performSwap(swapResponse);
  // Returns txid when the swap is successful or throws an error if the swap fails
  console.log("Transaction ID:", txid);
  console.log("Transaction URL:", `https://explorer.solana.com/tx/${txid}`);
}

swap();
