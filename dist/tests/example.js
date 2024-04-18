"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const bs58_1 = __importDefault(require("bs58"));
const __1 = __importDefault(require("../"));
async function swap() {
    const keypair = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode("YOUR_SECRET_KEY_HERE"));
    const solanaTracker = new __1.default(keypair, "https://api.solanatracker.io/rpc");
    const swapResponse = await solanaTracker.getSwapInstructions("So11111111111111111111111111111111111111112", // From Token
    "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", // To Token
    0.0005, // Amount to swap
    30, // Slippage
    keypair.publicKey.toBase58(), // Payer public key
    0.00005 // Priority fee (Recommended while network is congested)
    );
    const txid = await solanaTracker.performSwap(swapResponse);
    // Returns txid when the swap is successful or throws an error if the swap fails
    console.log("Transaction ID:", txid);
    console.log("Transaction URL:", `https://explorer.solana.com/tx/${txid}`);
}
swap();
