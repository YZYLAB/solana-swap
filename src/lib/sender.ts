import {
    Connection,
    SendOptions,
    TransactionSignature,
  } from "@solana/web3.js";
  
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
  }
  
  const DEFAULT_OPTIONS: TransactionSenderAndConfirmationWaiterOptions = {
    sendOptions: { skipPreflight: true },
    confirmationRetries: 30,
    confirmationRetryTimeout: 1000,
    lastValidBlockHeightBuffer: 150,
    resendInterval: 1000,
    confirmationCheckInterval: 1000,
    skipConfirmationCheck: false
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
  }): Promise<TransactionSignature | Error> {
    const {
      sendOptions,
      confirmationRetries,
      confirmationRetryTimeout,
      lastValidBlockHeightBuffer,
      resendInterval,
      confirmationCheckInterval,
      skipConfirmationCheck
    } = { ...DEFAULT_OPTIONS, ...options };
  
    const lastValidBlockHeight =
      blockhashWithExpiryBlockHeight.lastValidBlockHeight -
      lastValidBlockHeightBuffer;
  
    let retryCount = 0;
  
    while (retryCount <= confirmationRetries) {
      try {
        const signature = await connection.sendRawTransaction(
          serializedTransaction,
          sendOptions
        );

        if (skipConfirmationCheck) {
          return signature;
        }
  
        while (true) {
          const status = await connection.getSignatureStatus(signature);
  
          if (status.value && status.value.confirmationStatus === "finalized") {
            return signature;
          }
  
          if (status.value && status.value.err) {
            throw new Error(`Transaction failed: ${status.value.err}`);
          }
  
          await new Promise((resolve) =>
            setTimeout(resolve, confirmationCheckInterval)
          );
        }
      } catch (error) {
        if (
          retryCount === confirmationRetries ||
          error.message.includes("Transaction expired")
        ) {
          return new Error(error.message);
        }
  
        console.warn(`Retrying transaction: ${error.message}`);
        retryCount++;
  
        await new Promise((resolve) =>
          setTimeout(resolve, confirmationRetryTimeout)
        );
  
        const blockHeight = await connection.getBlockHeight();
        if (blockHeight > lastValidBlockHeight) {
          return new Error("Transaction expired");
        }
      }
    }
  
    return new Error("Transaction failed after maximum retries");
  }
  
  export { transactionSenderAndConfirmationWaiter };