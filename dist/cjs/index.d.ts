import { Keypair, ParsedTransactionWithMeta } from "@solana/web3.js";
import { TransactionSenderAndConfirmationWaiterOptions } from "./lib/sender";
import { RateResponse, SwapResponse } from "./types";
export type PriorityFeeLevel = "min" | "low" | "medium" | "high" | "veryHigh" | "unsafeMax";
export type FeeType = "add" | "deduct";
export type TxVersion = "v0" | "legacy";
export interface FeeConfig {
    wallet: string;
    percentage: number;
}
export interface CustomTip {
    wallet: string;
    amount: number;
}
export interface SwapOptions {
    priorityFee?: number | "auto";
    priorityFeeLevel?: PriorityFeeLevel;
    txVersion?: TxVersion;
    fee?: FeeConfig;
    customTip?: CustomTip;
    feeType?: FeeType;
    onlyDirectRoutes?: boolean;
}
export interface TransactionError {
    type: "InstructionError" | "InsufficientFunds" | "AccountNotFound" | "ProgramError" | "Unknown";
    message: string;
    instructionIndex?: number;
    programId?: string;
    rawError?: any;
}
export declare class SolanaTracker {
    private baseUrl;
    private connection;
    private readonly keypair;
    private readonly apiKey;
    private httpAgent;
    private debug;
    private customSendConnection;
    private customSendEndpoint;
    private keepAliveInterval;
    private customHeaders;
    constructor(keypair: Keypair, rpc: string, apiKey?: string, debug?: boolean);
    private createConnection;
    private log;
    private logError;
    setBaseUrl(url: string): Promise<void>;
    /**
     * Set a custom endpoint for sending transactions
     * Maintains a warm connection by sending keep-alive requests every 5 seconds
     * @param endpoint - Custom RPC endpoint URL for sending transactions
     * @param headers - Optional custom headers to include with requests
     */
    setCustomSendTransactionEndpoint(endpoint: string | null, headers?: Record<string, string>): Promise<void>;
    getCustomSendEndpoint(): string | null;
    private fetchWithRetry;
    getRate(from: string, to: string, amount: number | string | "auto", slippage: number | "auto"): Promise<RateResponse>;
    getSwapInstructions(from: string, to: string, fromAmount: number | string, slippage: number | "auto", payer: string, priorityFee?: number | "auto", forceLegacy?: boolean, additionalOptions?: SwapOptions): Promise<SwapResponse>;
    private confirmTransactionWithPolling;
    private confirmTransactionWithSubscription;
    parseTransactionError(signature: string): Promise<TransactionError | null>;
    performSwap(swapResponse: SwapResponse, options?: TransactionSenderAndConfirmationWaiterOptions & {
        debug?: boolean;
        useWebSocket?: boolean;
    }): Promise<string>;
    performSwapWithDetails(swapResponse: SwapResponse, options?: TransactionSenderAndConfirmationWaiterOptions & {
        debug?: boolean;
        useWebSocket?: boolean;
    }): Promise<{
        signature: string;
        error?: TransactionError;
    }>;
    getTransactionDetails(signature: string): Promise<ParsedTransactionWithMeta | null>;
    setDebug(enabled: boolean): void;
    updateRpcEndpoint(rpc: string): void;
    destroy(): void;
}
