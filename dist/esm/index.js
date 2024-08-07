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
import bs58 from "bs58";
import { Connection, Transaction, VersionedTransaction, } from "@solana/web3.js";
import { transactionSenderAndConfirmationWaiter } from "./lib/sender.js";
import { sendBundle, createTipTransaction, checkBundleStatus } from "./lib/jito.js";
export class SolanaTracker {
    constructor(keypair, rpc, apiKey) {
        this.baseUrl = "https://swap-v2.solanatracker.io";
        this.connection = new Connection(rpc);
        this.keypair = keypair;
        this.apiKey = apiKey || "";
    }
    setBaseUrl(url) {
        return __awaiter(this, void 0, void 0, function* () {
            this.baseUrl = url;
        });
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
                const response = yield axios.get(url, {
                    headers: {
                        "x-api-key": this.apiKey,
                    },
                });
                return response.data;
            }
            catch (error) {
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
            commitment: "processed",
            resendInterval: 1000,
            confirmationCheckInterval: 1000,
            skipConfirmationCheck: false,
            jito: {
                enabled: false,
                tip: 0
            }
        }) {
            var _a;
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
            const blockhash = yield this.connection.getLatestBlockhash();
            const blockhashWithExpiryBlockHeight = {
                blockhash: blockhash.blockhash,
                lastValidBlockHeight: blockhash.lastValidBlockHeight,
            };
            if (swapResponse.txVersion === 'v0') {
                txn = VersionedTransaction.deserialize(serializedTransactionBuffer);
                txn.sign([this.keypair]);
            }
            else {
                txn = Transaction.from(serializedTransactionBuffer);
                txn.sign(this.keypair);
            }
            if ((_a = options.jito) === null || _a === void 0 ? void 0 : _a.enabled) {
                // Create a tip transaction for the Jito block engine
                const tipTxn = yield createTipTransaction(this.keypair.publicKey.toBase58(), options.jito.tip);
                tipTxn.recentBlockhash = blockhash.blockhash;
                tipTxn.sign(this.keypair);
                const response = yield sendBundle([bs58.encode(txn.serialize()), bs58.encode(tipTxn.serialize())]);
                if (response.result) {
                    const txid = yield checkBundleStatus(response.result, options.confirmationRetries, options.commitment, options.confirmationCheckInterval);
                    return txid;
                }
            }
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
