"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const bs58_1 = __importDefault(require("bs58"));
const __1 = __importDefault(require("../"));
async function swap() {
    const keypair = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode("zi2ungRtxbHEqHH4CtRrbbPUq4DKMDkScNQ4exCsQEZerucBM2hwMca61hcGfAQy7vzDpdjodMqZn6kuu9vf7wQ"));
    const solanaTracker = new __1.default(keypair, "https://api.solanatracker.io/rpc");
    const swapResponse = await solanaTracker.getSwapInstructions("So11111111111111111111111111111111111111112", // From Token
    "4nJWRhrLR4YbomC6BRMLw5Dikhm56ngoaJ9FF237xvNZ", // To Token
    0.0005, // Amount to swap
    30, // Slippage
    keypair.publicKey.toBase58(), // Payer public key
    0.0005, // Priority fee (Recommended while network is congested)
    true // Force legacy transaction for Jupiter
    );
    const txid = await solanaTracker.performSwap(swapResponse, {
        sendOptions: { skipPreflight: true },
        confirmationRetries: 30,
        confirmationRetryTimeout: 1000,
        lastValidBlockHeightBuffer: 150,
        resendInterval: 1000,
        confirmationCheckInterval: 1000,
    });
    // Returns txid when the swap is successful or throws an error if the swap fails
    console.log("Transaction ID:", txid);
    console.log("Transaction URL:", `https://explorer.solana.com/tx/${txid}`);
}
swap();
