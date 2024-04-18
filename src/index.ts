import got from "got";
import { Connection, Keypair, Transaction, VersionedTransaction, BlockhashWithExpiryBlockHeight } from '@solana/web3.js';
import { transactionSenderAndConfirmationWaiter } from "./lib/sender";

interface RateResponse {
    amountIn: number;
    amountOut: number;
    minAmountOut: number;
    currentPrice: number;
    executionPrice: number;
    priceImpact: number;
    fee: number;
    baseCurrency: {
        decimals: number;
        mint: string;
    };
    quoteCurrency: {
        decimals: number;
        mint: string;
    };
    platformFee: number;
    platformFeeUI: number;
    isJupiter: boolean;
    rawQuoteResponse: any;
}

interface SwapResponse {
    txn: string;
    isJupiter: boolean;
    rate: RateResponse;
}

class SolanaTracker {
    private readonly baseUrl = "https://api.solanatracker.io";
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
            const response = await got(url, { responseType: "json" });
            return response.body as RateResponse;
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
        priorityFee?: number
    ): Promise<SwapResponse> {
        const params = new URLSearchParams({
            from,
            to,
            fromAmount: fromAmount.toString(),
            slippage: slippage.toString(),
            payer,
        });

        if (priorityFee) {
            params.append("priorityFee", priorityFee.toString());
        }

        const url = `${this.baseUrl}/swap?${params}`;

        try {
            const response = await got(url, { responseType: "json" });
            return response.body as SwapResponse;
        } catch (error) {
            console.error("Error fetching swap instructions:", error);
            throw error;
        }
    }

    async performSwap(swapResponse: SwapResponse, options = {
        sendOptions: { skipPreflight: true },
        confirmationRetries: 5,
        confirmationRetryTimeout: 500,
        lastValidBlockHeightBuffer: 150,
        resendInterval: 1000,
        confirmationCheckInterval: 1000,
    }): Promise<string> {
        const serializedTransactionBuffer = Buffer.from(swapResponse.txn, 'base64');
        let txn: VersionedTransaction | Transaction;

        if (swapResponse.isJupiter) {
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

        const response = await transactionSenderAndConfirmationWaiter({
            connection: this.connection,
            serializedTransaction: txn.serialize() as Buffer,
            blockhashWithExpiryBlockHeight,
            options: options
        });

        return response ? response.transaction.signatures[0] : null;
    }
}

export default SolanaTracker;
