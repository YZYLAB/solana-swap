import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { SolanaTracker } from "../";

async function swap() {
  const keypair = Keypair.fromSecretKey(
    bs58.decode(
      "YOUR_SECRET_KEY"
    )
  );
  const solanaTracker = new SolanaTracker(
    keypair,
    "https://rpc-mainnet.solanatracker.io/?api_key=YOUR_API_KEY" // Staked RPC: https://www.solanatracker.io/solana-rpc
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
