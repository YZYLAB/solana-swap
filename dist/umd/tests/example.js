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
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "@solana/web3.js", "bs58", "../"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const web3_js_1 = require("@solana/web3.js");
    const bs58_1 = __importDefault(require("bs58"));
    const __1 = require("../index.js");
    function swap() {
        return __awaiter(this, void 0, void 0, function* () {
            const keypair = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode("YOUR_SECRET_KEY"));
            const solanaTracker = new __1.SolanaTracker(keypair, "https://rpc-mainnet.solanatracker.io/?api_key=YOUR_API_KEY" // Staked RPC: https://www.solanatracker.io/solana-rpc
            );
            // Example 1: Basic swap (backward compatible)
            const swapResponse = yield solanaTracker.getSwapInstructions("So11111111111111111111111111111111111111112", // From Token (SOL)
            "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", // To Token (RAY)
            0.0001, // Amount to swap
            30, // Slippage
            keypair.publicKey.toBase58(), // Payer public key
            0.0005);
            // Example 2: Swap with auto priority fee
            const swapResponseAuto = yield solanaTracker.getSwapInstructions("So11111111111111111111111111111111111111112", "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", 0.0001, 30, keypair.publicKey.toBase58(), "auto", // Auto priority fee
            false, // forceLegacy
            { priorityFeeLevel: "medium" } // Priority level for auto fee
            );
            // Example 3: Swap 50% of wallet balance with custom fee
            const swapResponsePercent = yield solanaTracker.getSwapInstructions("So11111111111111111111111111111111111111112", "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", "50%", // Swap 50% of wallet balance
            30, keypair.publicKey.toBase58(), 0.0005, false, {
                fee: {
                    wallet: "YOUR_FEE_WALLET_ADDRESS",
                    percentage: 0.25 // 0.25% custom fee
                },
                feeType: "add", // Add fee on top
                onlyDirectRoutes: false // Allow multi-hop swaps
            });
            // Example 4: Swap entire wallet balance with v0 transaction
            const swapResponseAll = yield solanaTracker.getSwapInstructions("So11111111111111111111111111111111111111112", "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", "auto", // Use entire wallet balance
            30, keypair.publicKey.toBase58(), "auto", false, {
                priorityFeeLevel: "high", // High priority
                txVersion: "v0", // Use versioned transaction, this is the default.
                onlyDirectRoutes: true // Only direct routes
            });
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
});
