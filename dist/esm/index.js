var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import axios from "axios";
import { Connection, Transaction, VersionedTransaction, } from "@solana/web3.js";
import { transactionSenderAndConfirmationWaiter } from "./lib/sender.js";

export class SolanaTracker {
    constructor(keypair, rpc) {
        this.baseUrl = "https://swap-api.solanatracker.io";
        this.connection = new Connection(rpc);
        this.keypair = keypair;
    }
    getRate(from, to, amount, slippage) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = new URLSearchParams({
                from,
                to,
                amount: amount.toString(),
                slippage: slippage.toString(),
            });
            const url = `${this.baseUrl}/rate?${params}`;
            try {
                const response = yield axios.get(url);
                return response.data;
            }
            catch (error) {
                console.error("Error fetching rate:", error);
                throw error;
            }
        });
    }
    getSwapInstructions(from, to, fromAmount, slippage, payer, priorityFee, forceLegacy) {
        return __awaiter(this, void 0, void 0, function* () {
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
                const response = yield axios.get(url);
                response.data.forceLegacy = forceLegacy;
                return response.data;
            }
            catch (error) {
                console.error("Error fetching swap instructions:", error);
                throw error;
            }
        });
    }
    performSwap(swapResponse_1) {
        return __awaiter(this, arguments, void 0, function* (swapResponse, options = {
            sendOptions: { skipPreflight: true },
            confirmationRetries: 30,
            confirmationRetryTimeout: 1000,
            lastValidBlockHeightBuffer: 150,
            resendInterval: 1000,
            confirmationCheckInterval: 1000,
            skipConfirmationCheck: false,
        }) {
            let serializedTransactionBuffer;
            try {
                serializedTransactionBuffer = Buffer.from(swapResponse.txn, "base64");
            }
            catch (error) {
                const base64Str = swapResponse.txn;
                const binaryStr = atob(base64Str);
                const buffer = new Uint8Array(binaryStr.length);
                for (let i = 0; i < binaryStr.length; i++) {
                    buffer[i] = binaryStr.charCodeAt(i);
                }
                serializedTransactionBuffer = buffer;
            }
            let txn;
            if (swapResponse.isJupiter && !swapResponse.forceLegacy) {
                txn = VersionedTransaction.deserialize(serializedTransactionBuffer);
                txn.sign([this.keypair]);
            }
            else {
                txn = Transaction.from(serializedTransactionBuffer);
                txn.sign(this.keypair);
            }
            const blockhash = yield this.connection.getLatestBlockhash();
            const blockhashWithExpiryBlockHeight = {
                blockhash: blockhash.blockhash,
                lastValidBlockHeight: blockhash.lastValidBlockHeight,
            };
            const txid = yield transactionSenderAndConfirmationWaiter({
                connection: this.connection,
                serializedTransaction: txn.serialize(),
                blockhashWithExpiryBlockHeight,
                options: options,
            });
            return txid.toString();
        });
    }
}
