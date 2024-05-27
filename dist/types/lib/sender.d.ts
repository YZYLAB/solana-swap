/// <reference types="node" />
import { Connection, SendOptions, TransactionSignature } from "@solana/web3.js";
interface BlockhashWithExpiryBlockHeight {
    blockhash: string;
    lastValidBlockHeight: number;
}
interface TransactionSenderAndConfirmationWaiterOptions {
    sendOptions?: SendOptions;
    confirmationRetries?: number;
    confirmationRetryTimeout?: number;
    lastValidBlockHeightBuffer?: number;
    resendInterval?: number;
    confirmationCheckInterval?: number;
    skipConfirmationCheck?: boolean;
    commitment?: "confirmed" | "finalized" | "processed";
}
declare function transactionSenderAndConfirmationWaiter({ connection, serializedTransaction, blockhashWithExpiryBlockHeight, options, }: {
    connection: Connection;
    serializedTransaction: Buffer;
    blockhashWithExpiryBlockHeight: BlockhashWithExpiryBlockHeight;
    options?: Partial<TransactionSenderAndConfirmationWaiterOptions>;
}): Promise<TransactionSignature | Error>;
export { transactionSenderAndConfirmationWaiter };
