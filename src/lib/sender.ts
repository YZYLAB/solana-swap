import { Connection, SendOptions, TransactionExpiredBlockheightExceededError } from "@solana/web3.js";
import promiseRetry, { Options as PromiseRetryOptions } from "promise-retry";

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
}

const DEFAULT_OPTIONS: TransactionSenderAndConfirmationWaiterOptions = {
  sendOptions: { skipPreflight: true },
  confirmationRetries: 30,
  confirmationRetryTimeout: 1000,
  lastValidBlockHeightBuffer: 150,
  resendInterval: 1000,
  confirmationCheckInterval: 1000,
};

async function transactionSenderAndConfirmationWaiter({
  connection,
  serializedTransaction,
  blockhashWithExpiryBlockHeight,
  options = {},
}: {
  connection: Connection;
  serializedTransaction: Buffer;
  blockhashWithExpiryBlockHeight: BlockhashWithExpiryBlockHeight;
  options?: Partial<TransactionSenderAndConfirmationWaiterOptions>;
}) {
  const {
    sendOptions,
    confirmationRetries,
    confirmationRetryTimeout,
    lastValidBlockHeightBuffer,
    resendInterval,
    confirmationCheckInterval,
  } = { ...DEFAULT_OPTIONS, ...options };

  const txid = await connection.sendRawTransaction(
    serializedTransaction,
    sendOptions
  );

  const lastValidBlockHeight =
    blockhashWithExpiryBlockHeight.lastValidBlockHeight -
    lastValidBlockHeightBuffer;

  const resender = setInterval(async () => {
    try {
      await connection.sendRawTransaction(serializedTransaction, sendOptions);
    } catch (e) {
      console.warn(`Failed to resend transaction: ${e}`);
    }
  }, resendInterval);

  try {
    await promiseRetry(
      async (retry: (error: any) => never, attempt: number) => {
        const response = await connection.getSignatureStatuses([txid]);
        const status = response.value[0];

        if (!status) {
          retry(new Error("Transaction status not found"));
        } else if (status.confirmationStatus !== "confirmed") {
          const blockHeight = await connection.getBlockHeight();
          if (blockHeight > lastValidBlockHeight) {
            throw new TransactionExpiredBlockheightExceededError(
              txid,
            );
          }
          retry(new Error("Transaction not confirmed"));
        }
      },
      {
        retries: confirmationRetries,
        minTimeout: confirmationRetryTimeout,
      }
    );
  } catch (e) {
    if (e instanceof TransactionExpiredBlockheightExceededError) {
      return null;
    } else {
      throw e;
    }
  } finally {
    clearInterval(resender);
  }

  const response = await connection.getTransaction(txid, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  return response;
}

export { transactionSenderAndConfirmationWaiter };