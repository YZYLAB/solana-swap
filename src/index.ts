import axios from "axios";
import {
  Connection,
  Keypair,
  Transaction,
  VersionedTransaction,
  BlockhashWithExpiryBlockHeight,
} from "@solana/web3.js";
import { transactionSenderAndConfirmationWaiter } from "./lib/sender";
import { RateResponse, SwapResponse } from "./types";

export class SolanaTracker {
  private readonly baseUrl = "https://swap-api.solanatracker.io";
  private readonly connection: Connection;
  private readonly keypair: Keypair;

  constructor(keypair: Keypair, rpc: string) {
    this.connection = new Connection(rpc);
    this.keypair = keypair;
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
      console.error("Error fetching rate:", error);
      throw error;
    }
  }

  async getSwapInstructions(
    from: string,
    to: string,
    fromAmount: number,
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
      const response = await axios.get(url);
      response.data.forceLegacy = forceLegacy;
      return response.data as SwapResponse;
    } catch (error) {
      console.error("Error fetching swap instructions:", error);
      throw error;
    }
  }

  async performSwap(
    swapResponse: SwapResponse,
    options = {
      sendOptions: { skipPreflight: true },
      confirmationRetries: 30,
      confirmationRetryTimeout: 1000,
      lastValidBlockHeightBuffer: 150,
      resendInterval: 1000,
      confirmationCheckInterval: 1000,
      skipConfirmationCheck: false,
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
    if (swapResponse.isJupiter && !swapResponse.forceLegacy) {
      txn = VersionedTransaction.deserialize(serializedTransactionBuffer);
      txn.sign([this.keypair]);
    } else {
      txn = Transaction.from(serializedTransactionBuffer);
      txn.sign(this.keypair);
    }
    const blockhash = await this.connection.getLatestBlockhash();
    const blockhashWithExpiryBlockHeight: BlockhashWithExpiryBlockHeight = {
      blockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight,
    };
    const txid = await transactionSenderAndConfirmationWaiter({
      connection: this.connection,
      serializedTransaction: txn.serialize() as Buffer,
      blockhashWithExpiryBlockHeight,
      options: options,
    });
    return txid.toString();
  }
}