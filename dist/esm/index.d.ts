import { Keypair } from "@solana/web3.js";
import { TransactionSenderAndConfirmationWaiterOptions } from "./lib/sender";
import { RateResponse, SwapResponse } from "./types";
export declare class SolanaTracker {
    private baseUrl;
    private readonly connection;
    private readonly keypair;
    private readonly apiKey;
    constructor(keypair: Keypair, rpc: string, apiKey?: string);
    setBaseUrl(url: string): Promise<void>;
    getRate(from: string, to: string, amount: number, slippage: number): Promise<RateResponse>;
    getSwapInstructions(from: string, to: string, fromAmount: number | string, slippage: number, payer: string, priorityFee?: number, forceLegacy?: boolean): Promise<SwapResponse>;
    performSwap(swapResponse: SwapResponse, options?: TransactionSenderAndConfirmationWaiterOptions): Promise<string>;
}
