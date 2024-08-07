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
        define(["require", "exports", "axios", "bs58", "@solana/web3.js", "./lib/sender", "./lib/jito"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SolanaTracker = void 0;
    const axios_1 = __importDefault(require("axios"));
    const bs58_1 = __importDefault(require("bs58"));
    const web3_js_1 = require("@solana/web3.js");
    const sender_1 = require("./lib/sender");
    const jito_1 = require("./lib/jito");
    class SolanaTracker {
        constructor(keypair, rpc, apiKey) {
            this.baseUrl = "https://swap-v2.solanatracker.io";
            this.connection = new web3_js_1.Connection(rpc);
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
                    const response = yield axios_1.default.get(url);
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
                    const response = yield axios_1.default.get(url, {
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
                    txn = web3_js_1.VersionedTransaction.deserialize(serializedTransactionBuffer);
                    txn.sign([this.keypair]);
                }
                else {
                    txn = web3_js_1.Transaction.from(serializedTransactionBuffer);
                    txn.sign(this.keypair);
                }
                if ((_a = options.jito) === null || _a === void 0 ? void 0 : _a.enabled) {
                    // Create a tip transaction for the Jito block engine
                    const tipTxn = yield (0, jito_1.createTipTransaction)(this.keypair.publicKey.toBase58(), options.jito.tip);
                    tipTxn.recentBlockhash = blockhash.blockhash;
                    tipTxn.sign(this.keypair);
                    const response = yield (0, jito_1.sendBundle)([bs58_1.default.encode(txn.serialize()), bs58_1.default.encode(tipTxn.serialize())]);
                    if (response.result) {
                        const txid = yield (0, jito_1.checkBundleStatus)(response.result, options.confirmationRetries, options.commitment, options.confirmationCheckInterval);
                        return txid;
                    }
                }
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
