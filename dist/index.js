"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const got_1 = __importDefault(require("got"));
const web3_js_1 = require("@solana/web3.js");
const sender_1 = require("./lib/sender");
class SolanaTracker {
    constructor(keypair, rpc) {
        this.baseUrl = "https://api.solanatracker.io";
        this.connection = new web3_js_1.Connection(rpc);
        this.keypair = keypair;
    }
    async getRate(from, to, amount, slippage) {
        const params = new URLSearchParams({
            from,
            to,
            amount: amount.toString(),
            slippage: slippage.toString(),
        });
        const url = `${this.baseUrl}/rate?${params}`;
        try {
            const response = await (0, got_1.default)(url, { responseType: "json" });
            return response.body;
        }
        catch (error) {
            console.error("Error fetching rate:", error);
            throw error;
        }
    }
    async getSwapInstructions(from, to, fromAmount, slippage, payer, priorityFee) {
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
            const response = await (0, got_1.default)(url, { responseType: "json" });
            return response.body;
        }
        catch (error) {
            console.error("Error fetching swap instructions:", error);
            throw error;
        }
    }
    async performSwap(swapResponse, options = {
        sendOptions: { skipPreflight: true },
        confirmationRetries: 5,
        confirmationRetryTimeout: 500,
        lastValidBlockHeightBuffer: 150,
        resendInterval: 1000,
        confirmationCheckInterval: 1000,
    }) {
        const serializedTransactionBuffer = Buffer.from(swapResponse.txn, 'base64');
        let txn;
        if (swapResponse.isJupiter) {
            txn = web3_js_1.VersionedTransaction.deserialize(serializedTransactionBuffer);
            txn.sign([this.keypair]);
        }
        else {
            txn = web3_js_1.Transaction.from(serializedTransactionBuffer);
            txn.sign(this.keypair);
        }
        const blockhash = await this.connection.getLatestBlockhash();
        const blockhashWithExpiryBlockHeight = {
            blockhash: blockhash.blockhash,
            lastValidBlockHeight: blockhash.lastValidBlockHeight,
        };
        const response = await (0, sender_1.transactionSenderAndConfirmationWaiter)({
            connection: this.connection,
            serializedTransaction: txn.serialize(),
            blockhashWithExpiryBlockHeight,
            options: options
        });
        return response ? response.transaction.signatures[0] : null;
    }
}
exports.default = SolanaTracker;
