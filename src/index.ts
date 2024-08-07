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
    amount: number,
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
    priorityFee?: number,
    forceLegacy?: boolean
  ): Promise<SwapResponse> {
    const params = new URLSearchParams({
      from,
      to,
      fromAmount: fromAmount.toString(),
      slippage: slippage.toString(),
      payer,
      forceLegacy: forceLegacy ? "true" : "false",
    });
    if (priorityFee) {
      params.append("priorityFee", priorityFee.toString());
    }
    const url = `${this.baseUrl}/swap?${params}`;
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

    if (swapResponse.txVersion === 'v0') {
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