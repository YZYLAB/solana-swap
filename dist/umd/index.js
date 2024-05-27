var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "axios", "@solana/web3.js", "./lib/sender"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SolanaTracker = void 0;
    const axios_1 = __importDefault(require("axios"));
    const web3_js_1 = require("@solana/web3.js");
    const sender_1 = require("./lib/sender");
    class SolanaTracker {
        constructor(keypair, rpc) {
            this.baseUrl = "https://swap-api.solanatracker.io";
            this.connection = new web3_js_1.Connection(rpc);
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
                    const response = yield axios_1.default.get(url);
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
                    const response = yield axios_1.default.get(url);
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
                    txn = web3_js_1.VersionedTransaction.deserialize(serializedTransactionBuffer);
                    txn.sign([this.keypair]);
                }
                else {
                    txn = web3_js_1.Transaction.from(serializedTransactionBuffer);
                    txn.sign(this.keypair);
                }
                const blockhash = yield this.connection.getLatestBlockhash();
                const blockhashWithExpiryBlockHeight = {
                    blockhash: blockhash.blockhash,
                    lastValidBlockHeight: blockhash.lastValidBlockHeight,
                };
                const txid = yield (0, sender_1.transactionSenderAndConfirmationWaiter)({
                    connection: this.connection,
                    serializedTransaction: txn.serialize(),
                    blockhashWithExpiryBlockHeight,
                    options: options,
                });
                return txid.toString();
            });
        }
    }
    exports.SolanaTracker = SolanaTracker;
});
