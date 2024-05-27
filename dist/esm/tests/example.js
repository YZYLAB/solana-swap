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
import { SolanaTracker } from "../";
function swap() {
    return __awaiter(this, void 0, void 0, function* () {
        const keypair = Keypair.fromSecretKey(bs58.decode("YOUR_SECRET_KEY"));
        const solanaTracker = new SolanaTracker(keypair, "https://rpc.solanatracker.io/public?advancedTx=true");
        const swapResponse = yield solanaTracker.getSwapInstructions("So11111111111111111111111111111111111111112", // From Token
        "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", // To Token
        0.0005, // Amount to swap
        30, // Slippage
        keypair.publicKey.toBase58(), // Payer public key
        0.0005, // Priority fee (Recommended while network is congested)
        true // Force legacy transaction for Jupiter
        );
        const txid = yield solanaTracker.performSwap(swapResponse, {
            sendOptions: { skipPreflight: true },
            confirmationRetries: 30,
            confirmationRetryTimeout: 1000,
            lastValidBlockHeightBuffer: 150,
            resendInterval: 1000,
            confirmationCheckInterval: 1000,
            skipConfirmationCheck: false // Set to true if you want to skip confirmation checks and return txid immediately
        });
        // Returns txid when the swap is successful or throws an error if the swap fails
        console.log("Transaction ID:", txid);
        console.log("Transaction URL:", `https://explorer.solana.com/tx/${txid}`);
    });
}
swap();
