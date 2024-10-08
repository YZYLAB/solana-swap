"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const bs58_1 = __importDefault(require("bs58"));
const __1 = require("../");
function swap() {
    return __awaiter(this, void 0, void 0, function* () {
        const keypair = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode("YOUR_SECRET_KEY"));
        const solanaTracker = new __1.SolanaTracker(keypair, "https://rpc-mainnet.solanatracker.io/?api_key=YOUR_API_KEY" // Staked RPC: https://www.solanatracker.io/solana-rpc
        );
        const swapResponse = yield solanaTracker.getSwapInstructions("So11111111111111111111111111111111111111112", // From Token
        "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", // To Token
        0.0001, // Amount to swap
        30, // Slippage
        keypair.publicKey.toBase58(), // Payer public key
        0.0005);
        // Regular transaction
        try {
            const txid = yield solanaTracker.performSwap(swapResponse, {
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
        }
        catch (error) {
            const { signature, message } = error;
            console.error("Error performing swap:", message, signature);
        }
        // Jito transaction
        try {
            const txid = yield solanaTracker.performSwap(swapResponse, {
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
        }
        catch (error) {
            const { signature, message } = error;
            console.error("Error performing swap:", message, signature);
        }
    });
}
swap();
