import { Transaction } from "@solana/web3.js";
export declare function sendBundle(transactions: Array<string>): Promise<any>;
export declare const createTipTransaction: (wallet: string, tip: number) => Promise<Transaction>;
export declare function getBundleStatuses(bundleIds: string[]): Promise<any>;
export declare function checkBundleStatus(bundleId: string, maxRetries?: number, commitmentLevel?: 'processed' | 'confirmed' | 'finalized', retryInterval?: number): Promise<'success' | 'not_included' | 'max_retries_reached' | 'error'>;
