import axios from "axios";
import bs58 from "bs58";
import {
  Connection,
  Keypair,
  Transaction,
  VersionedTransaction,
  BlockhashWithExpiryBlockHeight,
} from "@solana/web3.js";
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

export interface SwapOptions {
  priorityFee?: number | "auto";
  priorityFeeLevel?: PriorityFeeLevel;
  txVersion?: TxVersion;
  fee?: FeeConfig;
  feeType?: FeeType;
  onlyDirectRoutes?: boolean;
}

export class SolanaTracker {
  private baseUrl = "https://swap-v2.solanatracker.io";
  private readonly connection: Connection;
  private readonly keypair: Keypair;
  private readonly apiKey: string;

  constructor(keypair: Keypair, rpc: string, apiKey?: string) {
    this.connection = new Connection(rpc);
    this.keypair = keypair;
    this.apiKey = apiKey || "";
  }

  async setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  async getRate(
    from: string,
    to: string,
    amount: number | string | "auto",
    slippage: number
  ): Promise<RateResponse> {
    const params = new URLSearchParams({
      from,
      to,
      amount: amount.toString(),
      slippage: slippage.toString(),
    });
    const url = `${this.baseUrl}/rate?${params}`;
    try {
      const response = await axios.get(url);
      return response.data as RateResponse;
    } catch (error) {
      throw error;
    }
  }

  async getSwapInstructions(
    from: string,
    to: string,
    fromAmount: number | string,
    slippage: number,
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

    // Add new optional parameters if provided
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

      if (!additionalOptions.txVersion && !forceLegacy) {
        queryParams.append("txVersion", 'v0');
      }

    }

    const url = `${this.baseUrl}/swap?${queryParams}`;

    console.log("Swap URL:", url);
    try {
      const response = await axios.get(url, {
        headers: {
          "x-api-key": this.apiKey,
        },
      });
      return response.data as SwapResponse;
    } catch (error) {
      throw error;
    }
  }

  async performSwap(
    swapResponse: SwapResponse,
    options: TransactionSenderAndConfirmationWaiterOptions = {
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

    if (options.jito?.enabled) {
      // Create a tip transaction for the Jito block engine
      const tipTxn = await createTipTransaction(this.keypair.publicKey.toBase58(), options.jito.tip);
      tipTxn.recentBlockhash = blockhash.blockhash;
      tipTxn.sign(this.keypair);

      const response = await sendBundle([bs58.encode(txn.serialize()), bs58.encode(tipTxn.serialize())]);
      if (response.result) {
        const txid = await checkBundleStatus(response.result, options.confirmationRetries, options.commitment, options.confirmationCheckInterval);
        return txid;
      }
    }

    const txid = await transactionSenderAndConfirmationWaiter({
      connection: this.connection,
      serializedTransaction: txn.serialize() as Buffer,
      blockhashWithExpiryBlockHeight,
      options: options,
    });
    return txid.toString();
  }
}