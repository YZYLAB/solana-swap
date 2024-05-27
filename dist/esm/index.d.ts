import { Keypair } from "@solana/web3.js";
import { RateResponse, SwapResponse } from "./types";
export declare class SolanaTracker {
    private readonly baseUrl;
    private readonly connection;
    private readonly keypair;
    constructor(keypair: Keypair, rpc: string);
    getRate(from: string, to: string, amount: number, slippage: number): Promise<RateResponse>;
    getSwapInstructions(from: string, to: string, fromAmount: number, slippage: number, payer: string, priorityFee?: number, forceLegacy?: boolean): Promise<SwapResponse>;
    performSwap(swapResponse: SwapResponse, options?: {
        sendOptions: {
            skipPreflight: boolean;
        };
        confirmationRetries: number;
        confirmationRetryTimeout: number;
        lastValidBlockHeightBuffer: number;
        resendInterval: number;
        confirmationCheckInterval: number;
        skipConfirmationCheck: boolean;
    }): Promise<string>;
}
