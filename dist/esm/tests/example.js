var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { SolanaTracker } from "../index.js";
function swap() {
    return __awaiter(this, void 0, void 0, function* () {
        const keypair = Keypair.fromSecretKey(bs58.decode("YOUR_SECRET_KEY"));
        const solanaTracker = new SolanaTracker(keypair, "https://rpc-mainnet.solanatracker.io/?api_key=YOUR_API_KEY", // Staked RPC: https://www.solanatracker.io/solana-rpc
        "YOUR_API_KEY", // Optional: API key for swap instructions
        false // Optional: Enable debug mode
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
            console.log("Transaction ID:", txid);
            console.log("Transaction URL:", `https://solscan.io/tx/${txid}`);
        }
        catch (error) {
            console.error("Error performing swap:", error.message);
        }
        // Transaction with WebSocket confirmation (more efficient)
        try {
            const txid = yield solanaTracker.performSwap(swapResponse, {
                sendOptions: { skipPreflight: true },
                confirmationRetries: 30,
                confirmationRetryTimeout: 500,
                commitment: "processed",
                useWebSocket: true // Use WebSocket for confirmation
            });
            console.log("Transaction ID:", txid);
            console.log("Transaction URL:", `https://solscan.io/tx/${txid}`);
        }
        catch (error) {
            console.error("Error performing swap:", error.message);
        }
        // Transaction with detailed error information
        const result = yield solanaTracker.performSwapWithDetails(swapResponse, {
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
        }
        else {
            console.log("Transaction successful:", result.signature);
            console.log("Transaction URL:", `https://solscan.io/tx/${result.signature}`);
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
            console.log("Transaction ID:", txid);
            console.log("Transaction URL:", `https://solscan.io/tx/${txid}`);
        }
        catch (error) {
            console.error("Error performing swap:", error.message);
        }
        // Nextblock example with custom send endpoint
        yield solanaTracker.setCustomSendTransactionEndpoint("https://london.nextblock.io", {
            'Authorization': 'API_KEY'
        });
        const swapResponseNextblock = yield solanaTracker.getSwapInstructions("So11111111111111111111111111111111111111112", "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", 1, 'auto', keypair.publicKey.toBase58(), 0, false, {
            customTip: {
                wallet: "nEXTBLockYgngeRmRrjDV31mGSekVPqZoMGhQEZtPVG",
                amount: 0.001 // 0.001 SOL tip
            },
            txVersion: "v0",
        });
        try {
            const txid = yield solanaTracker.performSwap(swapResponseNextblock, {
                sendOptions: { skipPreflight: true, maxRetries: 0 },
                confirmationRetries: 30,
                confirmationRetryTimeout: 500,
                commitment: "processed",
            });
            console.log("Nextblock Transaction ID:", txid);
        }
        catch (error) {
            console.error("Error with Nextblock:", error.message);
        }
        // Helius sender example
        yield solanaTracker.setCustomSendTransactionEndpoint("https://ams-sender.helius-rpc.com/fast");
        const swapResponseHelius = yield solanaTracker.getSwapInstructions("So11111111111111111111111111111111111111112", "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", 0.0001, 'auto', keypair.publicKey.toBase58(), 0, false, {
            customTip: {
                wallet: "4ACfpUFoaSD9bfPdeu6DBt89gB6ENTeHBXCAi87NhDEE",
                amount: 0.005 // 0.005 SOL tip
            },
            txVersion: "v0",
        });
        try {
            const txid = yield solanaTracker.performSwap(swapResponseHelius, {
                sendOptions: { skipPreflight: true, maxRetries: 0 },
                confirmationRetries: 30,
                useWebSocket: false,
                confirmationRetryTimeout: 500,
                lastValidBlockHeightBuffer: 150,
                resendInterval: 1000,
                confirmationCheckInterval: 200,
                commitment: "processed",
                skipConfirmationCheck: false
            });
            console.log("Helius Transaction ID:", txid);
        }
        catch (error) {
            console.error("Error with Helius:", error.message);
        }
        // Clear custom send endpoint to go back to regular RPC
        yield solanaTracker.setCustomSendTransactionEndpoint(null);
        // Clean up resources when done
        solanaTracker.destroy();
    });
}
swap();
