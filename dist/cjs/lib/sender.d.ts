/// <reference types="node" />
import { Connection, SendOptions, TransactionSignature, Commitment } from "@solana/web3.js";
interface BlockhashWithExpiryBlockHeight {
    blockhash: string;
    lastValidBlockHeight: number;
}
export declare const COMMITMENT_LEVELS: Record<Commitment, number>;
export type SupportedCommitment = 'processed' | 'confirmed' | 'finalized';
export interface TransactionSenderAndConfirmationWaiterOptions {
    sendOptions?: SendOptions;
    confirmationRetries?: number;
    confirmationRetryTimeout?: number;
    lastValidBlockHeightBuffer?: number;
    resendInterval?: number;
    confirmationCheckInterval?: number;
    skipConfirmationCheck?: boolean;
    commitment?: SupportedCommitment;
    jito?: {
        enabled: boolean;
        tip: number;
    };
}
declare function transactionSenderAndConfirmationWaiter({ connection, serializedTransaction, blockhashWithExpiryBlockHeight, options, }: {
    connection: Connection;
    serializedTransaction: Buffer;
    blockhashWithExpiryBlockHeight: BlockhashWithExpiryBlockHeight;
    options?: Partial<TransactionSenderAndConfirmationWaiterOptions>;
}): Promise<TransactionSignature>;
export { transactionSenderAndConfirmationWaiter };
