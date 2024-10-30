import {
  Connection,
  SendOptions,
  TransactionSignature,
  Commitment,
} from "@solana/web3.js";

interface BlockhashWithExpiryBlockHeight {
  blockhash: string;
  lastValidBlockHeight: number;
}

class TransactionError extends Error {
  signature: string;

  constructor(message: string, signature: string) {
    super(message);
    this.name = 'TransactionError';
    this.signature = signature;
  }
}

export const COMMITMENT_LEVELS: Record<Commitment, number> = {
  processed: 0,
  confirmed: 1,
  finalized: 2,
  recent: 0,  // Equivalent to 'processed'
  single: 1,  // Equivalent to 'confirmed'
  singleGossip: 1,  // Equivalent to 'confirmed'
  root: 2,  // Equivalent to 'finalized'
  max: 2,  // Equivalent to 'finalized'
};

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

const DEFAULT_OPTIONS: TransactionSenderAndConfirmationWaiterOptions = {
  sendOptions: { skipPreflight: true },
  confirmationRetries: 30,
  confirmationRetryTimeout: 1000,
  lastValidBlockHeightBuffer: 150,
  resendInterval: 1000,
  confirmationCheckInterval: 1000,
  skipConfirmationCheck: false,
  commitment: "processed",
  jito: {
    enabled: false,
    tip: 0,
  }
};

async function transactionSenderAndConfirmationWaiter({
  connection,
  serializedTransaction,
  blockhashWithExpiryBlockHeight,
  options = DEFAULT_OPTIONS,
}: {
  connection: Connection;
  serializedTransaction: Buffer;
  blockhashWithExpiryBlockHeight: BlockhashWithExpiryBlockHeight;
  options?: Partial<TransactionSenderAndConfirmationWaiterOptions>;
}): Promise<TransactionSignature> {
  const {
    sendOptions,
    confirmationRetries,
    confirmationRetryTimeout,
    lastValidBlockHeightBuffer,
    resendInterval,
    confirmationCheckInterval,
    skipConfirmationCheck,
    commitment
  } = { ...DEFAULT_OPTIONS, ...options };

  const lastValidBlockHeight =
    blockhashWithExpiryBlockHeight.lastValidBlockHeight +
    (lastValidBlockHeightBuffer || 150);

  // Send the transaction initially
  let signature: TransactionSignature;
  try {
    signature = await connection.sendRawTransaction(
      serializedTransaction,
      sendOptions
    );
  } catch (error: any) {
    throw new TransactionError(`Failed to send transaction: ${error.message}`, '');
  }

  if (skipConfirmationCheck) {
    return signature;
  }

  // Set up transaction resend interval
  const resendIntervalId = resendInterval ? setInterval(async () => {
    try {
      await connection.sendRawTransaction(
        serializedTransaction,
        sendOptions
      );
    } catch (error) {}
  }, resendInterval < 1000 ? 1000 : resendInterval) : null;

  // Loop for confirmation check
  let retryCount = 0;
  while (retryCount <= (confirmationRetries || 30)) {
    try {
      const status = await connection.getSignatureStatus(signature);

      if (status.value && status.value.confirmationStatus) {
        if (resendIntervalId) {
          clearInterval(resendIntervalId);
        }
      }
      if (status.value && status.value.confirmationStatus &&
        COMMITMENT_LEVELS[status.value.confirmationStatus] >= COMMITMENT_LEVELS[commitment as SupportedCommitment]) {
        if (resendIntervalId) {
          clearInterval(resendIntervalId);
        }
        return signature;
      }

      if (status.value && status.value.err) {
        if (resendIntervalId) {
          clearInterval(resendIntervalId);
        }
        throw new TransactionError(`Transaction failed: ${status.value.err}`, signature);
      }

      const blockHeight = await connection.getBlockHeight();
      if (blockHeight > lastValidBlockHeight) {
        if (resendIntervalId) {
          clearInterval(resendIntervalId);
        }
        throw new TransactionError("Transaction expired", signature);
      }

      await new Promise((resolve) =>
        setTimeout(resolve, confirmationCheckInterval)
      );

      retryCount++;
    } catch (error: any) {
      if (resendIntervalId) {
        clearInterval(resendIntervalId);
      }
      if (error instanceof TransactionError) {
        throw error;
      }
      throw new TransactionError(`Confirmation check failed: ${error.message}`, signature);
    }
  }

  if (resendIntervalId) {
    clearInterval(resendIntervalId);
  }
  throw new TransactionError("Transaction failed after maximum retries", signature);
}

export { transactionSenderAndConfirmationWaiter };