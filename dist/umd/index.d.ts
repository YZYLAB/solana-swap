import { Keypair } from "@solana/web3.js";
import { TransactionSenderAndConfirmationWaiterOptions } from "./lib/sender";
import { RateResponse, SwapResponse } from "./types";
export type PriorityFeeLevel = "min" | "low" | "medium" | "high" | "veryHigh" | "unsafeMax";
export type FeeType = "add" | "deduct";
export type TxVersion = "v0" | "legacy";
export interface FeeConfig {
    wallet: string;
    percentage: number;
}
export interface SwapOptions {
    priorityFee?: number | "auto";
    priorityFeeLevel?: PriorityFeeLevel;
    txVersion?: TxVersion;
    fee?: FeeConfig;
    feeType?: FeeType;
    onlyDirectRoutes?: boolean;
}
export declare class SolanaTracker {
    private baseUrl;
    private readonly connection;
    private readonly keypair;
    private readonly apiKey;
    constructor(keypair: Keypair, rpc: string, apiKey?: string);
    setBaseUrl(url: string): Promise<void>;
    getRate(from: string, to: string, amount: number | string | "auto", slippage: number): Promise<RateResponse>;
    getSwapInstructions(from: string, to: string, fromAmount: number | string, slippage: number, payer: string, priorityFee?: number | "auto", forceLegacy?: boolean, additionalOptions?: SwapOptions): Promise<SwapResponse>;
    performSwap(swapResponse: SwapResponse, options?: TransactionSenderAndConfirmationWaiterOptions): Promise<string>;
}
