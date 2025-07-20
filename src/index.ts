import bs58 from "bs58";
import {
  Connection,
  Keypair,
  Transaction,
  VersionedTransaction,
  BlockhashWithExpiryBlockHeight,
  TransactionSignature,
  ParsedTransactionWithMeta,
  ConnectionConfig,
} from "@solana/web3.js";
import { Agent as HttpsAgent } from "https";
import { Agent as HttpAgent } from "http";
import { transactionSenderAndConfirmationWaiter, TransactionSenderAndConfirmationWaiterOptions } from "./lib/sender";
import { RateResponse, SwapResponse } from "./types";
import { sendBundle, createTipTransaction, checkBundleStatus } from "./lib/jito";

export type PriorityFeeLevel = "min" | "low" | "medium" | "high" | "veryHigh" | "unsafeMax";
export type FeeType = "add" | "deduct";
export type TxVersion = "v0" | "legacy";

export interface FeeConfig {
  wallet: string;
  percentage: number;
}

export interface CustomTip {
  wallet: string;
  amount: number; // in SOL
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

export class SolanaTracker {
  private baseUrl = "https://swap-v2.solanatracker.io";
  private connection: Connection;
  private readonly keypair: Keypair;
  private readonly apiKey: string;
  private httpAgent: HttpAgent | HttpsAgent;
  private debug: boolean = false;

  // Custom send endpoint properties
  private customSendConnection: Connection | null = null;
  private customSendEndpoint: string | null = null;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private customHeaders: Record<string, string> = {};

  constructor(keypair: Keypair, rpc: string, apiKey?: string, debug: boolean = false) {
    this.keypair = keypair;
    this.apiKey = apiKey || "";
    this.debug = debug;

    // Create appropriate HTTP agent
    const isHttps = rpc.toLowerCase().startsWith("https://");
    const agentOptions = {
      keepAlive: true,
      keepAliveMsecs: 10000,
      maxSockets: 50,
    };
    this.httpAgent = isHttps ? new HttpsAgent(agentOptions) : new HttpAgent(agentOptions);

    // Create connection
    this.connection = this.createConnection(rpc);
  }

  private createConnection(rpc: string): Connection {
    // Handle WebSocket endpoint
    let wsEndpoint: string;
    if (rpc.toLowerCase().startsWith("https://")) {
      wsEndpoint = rpc.replace(/^https:\/\//i, "wss://");
    } else if (rpc.toLowerCase().startsWith("http://")) {
      wsEndpoint = rpc.replace(/^http:\/\//i, "ws://");
    } else {
      wsEndpoint = `wss://${rpc}`;
      rpc = `https://${rpc}`;
    }

    const connectionConfig: ConnectionConfig = {
      commitment: "confirmed",
      httpAgent: this.httpAgent,
      disableRetryOnRateLimit: false,
      wsEndpoint,
    };

    return new Connection(rpc, connectionConfig);
  }

  private log(...args: any[]) {
    if (this.debug) {
      console.log("[SolanaTracker]", ...args);
    }
  }

  private logError(...args: any[]) {
    if (this.debug) {
      console.error("[SolanaTracker]", ...args);
    }
  }

  async setBaseUrl(url: string) {
    if (!url.match(/^https?:\/\//i)) {
      url = `https://${url}`;
    }
    this.baseUrl = url;
  }

  /**
   * Set a custom endpoint for sending transactions
   * Maintains a warm connection by sending keep-alive requests every 5 seconds
   * @param endpoint - Custom RPC endpoint URL for sending transactions
   * @param headers - Optional custom headers to include with requests
   */
  async setCustomSendTransactionEndpoint(endpoint: string | null, headers?: Record<string, string>) {
    // Clear existing keep-alive interval
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }

    // Clear existing custom connection
    if (this.customSendConnection) {
      this.customSendConnection = null;
    }

    if (!endpoint) {
      this.customSendEndpoint = null;
      this.customHeaders = {};
      this.log("Custom send endpoint cleared");
      return;
    }

    try {
      // Store custom headers
      this.customHeaders = headers || {};

      // Create custom connection for sending
      const isHttps = endpoint.toLowerCase().startsWith("https://");
      const agentOptions = {
        keepAlive: true,
        keepAliveMsecs: 10000,
        maxSockets: 50,
      };
      const customAgent = isHttps ? new HttpsAgent(agentOptions) : new HttpAgent(agentOptions);

      // Create connection with custom headers
      this.customSendConnection = new Connection(endpoint, {
        commitment: "processed",
        httpAgent: customAgent,
        httpHeaders: this.customHeaders,
      });

      this.customSendEndpoint = endpoint;
      this.log("Custom send endpoint set:", endpoint);
      if (Object.keys(this.customHeaders).length > 0) {
        this.log("Custom headers configured:", Object.keys(this.customHeaders));
      }

      // Start keep-alive interval with simple HTTP GET
      this.keepAliveInterval = setInterval(async () => {
        try {
          // Simple GET request to keep connection warm
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);

          await fetch(endpoint, {
            method: 'GET',
            signal: controller.signal,
            headers: {
              'User-Agent': 'SolanaTracker/1.0',
              ...this.customHeaders,
            },
          });

          clearTimeout(timeout);
          this.log("Keep-alive ping sent");
        } catch (error) {
          // Ignore errors - endpoint might not support GET
          this.log("Keep-alive ping failed (ignored)");
        }
      }, 5000);

      // Do initial ping (ignore errors)
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        await fetch(endpoint, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'User-Agent': 'SolanaTracker/1.0',
            ...this.customHeaders,
          },
        });

        clearTimeout(timeout);
        this.log("Custom send endpoint is reachable");
      } catch (error) {
        // Ignore initial ping errors
        this.log("Initial ping failed (ignored) - endpoint may not support GET requests");
      }
    } catch (error) {
      this.logError("Failed to set custom endpoint:", error);
      throw error;
    }
  }

  getCustomSendEndpoint(): string | null {
    return this.customSendEndpoint;
  }

  private async fetchWithRetry(url: string, options: RequestInit = {}, retries = 3): Promise<Response> {
    let lastError: Error | null = null;

    for (let i = 0; i < retries; i++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "x-api-key": this.apiKey,
            ...options.headers,
          },
        });

        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}, message: ${await response.text()}`);
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }

    throw lastError || new Error("Failed to fetch after retries");
  }

  async getRate(
    from: string,
    to: string,
    amount: number | string | "auto",
    slippage: number | "auto"
  ): Promise<RateResponse> {
    const params = new URLSearchParams({
      from,
      to,
      amount: amount.toString(),
      slippage: slippage.toString(),
    });

    const url = `${this.baseUrl}/rate?${params}`;

    try {
      const response = await this.fetchWithRetry(url);
      return await response.json() as RateResponse;
    } catch (error) {
      throw new Error(`Failed to get rate: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async getSwapInstructions(
    from: string,
    to: string,
    fromAmount: number | string,
    slippage: number | "auto",
    payer: string,
    priorityFee?: number | "auto",
    forceLegacy?: boolean,
    additionalOptions?: SwapOptions
  ): Promise<SwapResponse> {
    const queryParams = new URLSearchParams({
      from,
      to,
      fromAmount: fromAmount.toString(),
      slippage: slippage.toString(),
      payer,
    });

    // Handle legacy parameters
    if (priorityFee !== undefined) {
      queryParams.append("priorityFee", priorityFee.toString());
    }

    if (forceLegacy) {
      queryParams.append("txVersion", "legacy");
    }

    // Add additional options
    if (additionalOptions) {
      if (additionalOptions.priorityFeeLevel) {
        queryParams.append("priorityFeeLevel", additionalOptions.priorityFeeLevel);
      }

      if (additionalOptions.txVersion) {
        queryParams.append("txVersion", additionalOptions.txVersion);
      }

      if (additionalOptions.feeType) {
        queryParams.append("feeType", additionalOptions.feeType);
      }

      if (additionalOptions.onlyDirectRoutes !== undefined) {
        queryParams.append("onlyDirectRoutes", additionalOptions.onlyDirectRoutes.toString());
      }

      if (additionalOptions.fee) {
        queryParams.append("fee", `${additionalOptions.fee.wallet}:${additionalOptions.fee.percentage}`);
      }

      if (additionalOptions.customTip) {
        queryParams.append("customTip", `${additionalOptions.customTip.wallet}:${additionalOptions.customTip.amount}`);
      }

      if (!additionalOptions.txVersion && !forceLegacy) {
        queryParams.append("txVersion", 'v0');
      }
    } else if (!forceLegacy) {
      queryParams.append("txVersion", "v0");
    }

    const url = `${this.baseUrl}/swap?${queryParams}`;
    this.log("Swap URL:", url);

    try {
      const response = await this.fetchWithRetry(url);
      return await response.json() as SwapResponse;
    } catch (error) {
      throw new Error(`Failed to get swap instructions: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async confirmTransactionWithPolling(
    signature: TransactionSignature,
    commitment = "confirmed",
    maxRetries = 30,
    retryInterval = 1000
  ): Promise<{ confirmed: boolean; slot?: number; err?: any }> {
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const status = await this.connection.getSignatureStatus(signature);
        if (status.value !== null) {
          if (status.value.err) {
            return { confirmed: false, err: status.value.err, slot: status.value.slot };
          }

          if (status.value.confirmationStatus === commitment ||
            status.value.confirmationStatus === "finalized" || (
              commitment === 'processed' && status.value.confirmationStatus === 'confirmed'
            )) {
            return { confirmed: true, slot: status.value.slot };
          }
        }

        await new Promise(resolve => setTimeout(resolve, retryInterval));
        retries++;
      } catch (error) {
        this.logError(`Error checking transaction status (attempt ${retries + 1}):`, error);
        retries++;
        await new Promise(resolve => setTimeout(resolve, retryInterval));
      }
    }

    return { confirmed: false, err: "Confirmation timeout" };
  }

  private async confirmTransactionWithSubscription(
    signature: TransactionSignature,
    commitment = "confirmed",
    timeout = 30000
  ): Promise<{ confirmed: boolean; slot?: number; err?: any }> {
    return new Promise((resolve) => {
      let subscriptionId: number | null = null;
      let timeoutId: NodeJS.Timeout | null = null;

      const cleanup = () => {
        if (subscriptionId !== null) {
          this.connection.removeSignatureListener(subscriptionId);
        }
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }
      };

      timeoutId = setTimeout(() => {
        cleanup();
        resolve({ confirmed: false, err: "Confirmation timeout" });
      }, timeout);

      subscriptionId = this.connection.onSignature(
        signature,
        (result, context) => {
          cleanup();

          if (result.err) {
            resolve({ confirmed: false, err: result.err, slot: context.slot });
          } else {
            resolve({ confirmed: true, slot: context.slot });
          }
        },
        commitment as "confirmed" | "processed" | "finalized"
      );

      // Check immediately in case already confirmed
      this.connection.getSignatureStatus(signature).then((status) => {
        if (status.value !== null) {
          if (status.value.err) {
            cleanup();
            resolve({ confirmed: false, err: status.value.err, slot: status.value.slot });
          } else if (
            status.value.confirmationStatus === commitment ||
            status.value.confirmationStatus === "finalized"
          ) {
            cleanup();
            resolve({ confirmed: true, slot: status.value.slot });
          }
        }
      }).catch((error) => {
        this.logError("Error checking initial status:", error);
      });
    });
  }

  async parseTransactionError(signature: string): Promise<TransactionError | null> {
    try {
      const parsedTx = await this.connection.getParsedTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });

      if (!parsedTx || !parsedTx.meta || !parsedTx.meta.err) {
        return null;
      }

      const error = parsedTx.meta.err;

      if (typeof error === "object" && "InstructionError" in error) {
        // Ensure InstructionError is an array before destructuring
        const instructionErrorArray = error.InstructionError;
        if (Array.isArray(instructionErrorArray) && instructionErrorArray.length >= 2) {
          const index = instructionErrorArray[0] as number;
          const instructionError = instructionErrorArray[1];
          const instruction = parsedTx.transaction.message.instructions[index];
          const programId = instruction.programId.toString();

          return {
            type: "InstructionError",
            message: `Instruction ${index} failed: ${JSON.stringify(instructionError)}`,
            instructionIndex: index,
            programId,
            rawError: error,
          };
        }
        
        // Handle case where InstructionError doesn't have expected format
        return {
          type: "InstructionError",
          message: `Instruction error: ${JSON.stringify(error.InstructionError)}`,
          rawError: error,
        };
      }

      if (error === "InsufficientFundsForRent") {
        return {
          type: "InsufficientFunds",
          message: "Insufficient funds for rent",
          rawError: error,
        };
      }

      if (error === "AccountNotFound") {
        return {
          type: "AccountNotFound",
          message: "Required account not found",
          rawError: error,
        };
      }

      if (parsedTx.meta.logMessages) {
        const errorLog = parsedTx.meta.logMessages.find(log =>
          log.includes("Error") || log.includes("failed") || log.includes("Failed")
        );

        if (errorLog) {
          return {
            type: "ProgramError",
            message: errorLog,
            rawError: error,
          };
        }
      }

      return {
        type: "Unknown",
        message: `Unknown error: ${JSON.stringify(error)}`,
        rawError: error,
      };
    } catch (err) {
      this.logError("Failed to parse transaction error:", err);
      return {
        type: "Unknown",
        message: "Failed to parse transaction error",
        rawError: err,
      };
    }
  }

  async performSwap(
    swapResponse: SwapResponse,
    options: TransactionSenderAndConfirmationWaiterOptions & {
      debug?: boolean;
      useWebSocket?: boolean;
    } = {
        sendOptions: { skipPreflight: true },
        confirmationRetries: 30,
        confirmationRetryTimeout: 1000,
        lastValidBlockHeightBuffer: 150,
        commitment: "processed",
        resendInterval: 1000,
        confirmationCheckInterval: 1000,
        skipConfirmationCheck: false,
        jito: {
          enabled: false,
          tip: 0
        }
      }
  ): Promise<string> {
    if (options.debug !== undefined) {
      this.debug = options.debug;
    }

    // Deserialize transaction
    let serializedTransactionBuffer: Buffer | Uint8Array;
    try {
      serializedTransactionBuffer = Buffer.from(swapResponse.txn, "base64");
    } catch (error) {
      const base64Str = swapResponse.txn;
      const binaryStr = atob(base64Str);
      const buffer = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        buffer[i] = binaryStr.charCodeAt(i);
      }
      serializedTransactionBuffer = buffer;
    }

    let txn: VersionedTransaction | Transaction;
    const blockhash = await this.connection.getLatestBlockhash();
    const blockhashWithExpiryBlockHeight: BlockhashWithExpiryBlockHeight = {
      blockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight,
    };

    if (swapResponse.type === 'v0') {
      txn = VersionedTransaction.deserialize(serializedTransactionBuffer);
      txn.sign([this.keypair]);
    } else {
      txn = Transaction.from(serializedTransactionBuffer);
      txn.sign(this.keypair);
    }

    let txid: string;

    try {
      // Send transaction
      if (options.jito?.enabled) {
        // Jito bundle
        const transactions: string[] = [bs58.encode(txn.serialize())];

        const tipTxn = await createTipTransaction(
          this.keypair.publicKey.toBase58(),
          options.jito.tip || 0
        );

        tipTxn.recentBlockhash = blockhash.blockhash;
        tipTxn.sign(this.keypair);
        transactions.push(bs58.encode(tipTxn.serialize()));

        const response = await sendBundle(transactions);
        if (!response.result) {
          throw new Error("Failed to send Jito bundle");
        }

        txid = await checkBundleStatus(
          response.result,
          options.confirmationRetries,
          options.commitment,
          options.confirmationCheckInterval
        );
      } else if (this.customSendConnection && this.customSendEndpoint) {
        // Use custom send endpoint with direct fetch
        this.log("Using custom send endpoint");

        try {
          // Prepare the RPC request
          const rpcRequest = {
            jsonrpc: "2.0",
            id: 1,
            method: "sendTransaction",
            params: [
              bs58.encode(txn.serialize()),
              {
                encoding: "base58",
                skipPreflight: options.sendOptions?.skipPreflight ?? true,
                preflightCommitment: options.sendOptions?.preflightCommitment || "processed",
                maxRetries: options.sendOptions?.maxRetries ?? 0,
                minContextSlot: options.sendOptions?.minContextSlot,
              }
            ]
          };

          const response = await fetch(this.customSendEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...this.customHeaders,
            },
            body: JSON.stringify(rpcRequest),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();
          if (result.error) {
            throw new Error(`RPC error: ${result.error.message || JSON.stringify(result.error)}`);
          }

          txid = result.result;
          this.log("Transaction sent via custom endpoint:", txid);
        } catch (error) {
          // If custom endpoint fails, fallback to main connection
          this.logError("Custom send endpoint failed, falling back to main connection:", error);

          txid = await transactionSenderAndConfirmationWaiter({
            connection: this.connection,
            serializedTransaction: txn.serialize() as Buffer,
            blockhashWithExpiryBlockHeight,
            options: options,
          });
        }
      } else {
        // Regular send
        txid = await transactionSenderAndConfirmationWaiter({
          connection: this.connection,
          serializedTransaction: txn.serialize() as Buffer,
          blockhashWithExpiryBlockHeight,
          options: options,
        });
      }

      // Confirm if needed
      if (this.customSendConnection || options.jito?.enabled) {
        let confirmationResult: { confirmed: boolean; slot?: number; err?: any };

        if (options.useWebSocket) {
          confirmationResult = await this.confirmTransactionWithSubscription(
            txid,
            options.commitment || "confirmed",
            (options.confirmationRetries || 30) * (options.confirmationRetryTimeout || 1000)
          );
        } else {
          confirmationResult = await this.confirmTransactionWithPolling(
            txid,
            options.commitment || "confirmed",
            options.confirmationRetries || 30,
            options.confirmationRetryTimeout || 1000
          );
        }

        if (!confirmationResult.confirmed) {
          const error = await this.parseTransactionError(txid);
          const errorMessage = error?.message || "Failed to confirm";
          throw new Error(`Transaction ${txid} failed: ${errorMessage}`);
        }
      }

      return txid;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      if (txid!) {
        const parsedError = await this.parseTransactionError(txid);
        if (parsedError) {
          throw new Error(`Swap ${txid} failed: ${parsedError.message}`);
        }
        throw new Error(`Swap ${txid} failed: ${errorMessage}`);
      }

      throw new Error(`Swap failed: ${errorMessage}`);
    }
  }

  async performSwapWithDetails(
    swapResponse: SwapResponse,
    options: TransactionSenderAndConfirmationWaiterOptions & {
      debug?: boolean;
      useWebSocket?: boolean;
    } = {
        sendOptions: { skipPreflight: true },
        confirmationRetries: 30,
        confirmationRetryTimeout: 1000,
        lastValidBlockHeightBuffer: 150,
        commitment: "processed",
        resendInterval: 1000,
        confirmationCheckInterval: 1000,
        skipConfirmationCheck: false,
        jito: {
          enabled: false,
          tip: 0
        }
      }
  ): Promise<{ signature: string; error?: TransactionError }> {
    try {
      const signature = await this.performSwap(swapResponse, options);
      return { signature };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const txidMatch = errorMessage.match(/([1-9A-HJ-NP-Za-km-z]{32,})/);

      if (txidMatch) {
        const txid = txidMatch[0];
        const parsedError = await this.parseTransactionError(txid);
        return {
          signature: txid,
          error: parsedError || {
            type: "Unknown",
            message: errorMessage,
            rawError: error,
          },
        };
      }

      return {
        signature: "",
        error: {
          type: "Unknown",
          message: errorMessage,
          rawError: error,
        },
      };
    }
  }

  async getTransactionDetails(signature: string): Promise<ParsedTransactionWithMeta | null> {
    try {
      return await this.connection.getParsedTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
    } catch (error) {
      this.logError("Failed to get transaction details:", error);
      return null;
    }
  }

  setDebug(enabled: boolean) {
    this.debug = enabled;
  }

  updateRpcEndpoint(rpc: string) {
    if (this.httpAgent) {
      this.httpAgent.destroy();
    }

    const isHttps = rpc.toLowerCase().startsWith("https://");
    const agentOptions = {
      keepAlive: true,
      keepAliveMsecs: 10000,
      maxSockets: 50,
    };
    this.httpAgent = isHttps ? new HttpsAgent(agentOptions) : new HttpAgent(agentOptions);

    this.connection = this.createConnection(rpc);
  }

  destroy() {
    if (this.httpAgent) {
      this.httpAgent.destroy();
    }

    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }

    this.customSendConnection = null;
    this.customSendEndpoint = null;
  }
}