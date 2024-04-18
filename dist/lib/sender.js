"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionSenderAndConfirmationWaiter = void 0;
const web3_js_1 = require("@solana/web3.js");
const promise_retry_1 = __importDefault(require("promise-retry"));
const DEFAULT_OPTIONS = {
    sendOptions: { skipPreflight: true },
    confirmationRetries: 30,
    confirmationRetryTimeout: 1000,
    lastValidBlockHeightBuffer: 150,
    resendInterval: 1000,
    confirmationCheckInterval: 1000,
};
async function transactionSenderAndConfirmationWaiter({ connection, serializedTransaction, blockhashWithExpiryBlockHeight, options = {}, }) {
    const { sendOptions, confirmationRetries, confirmationRetryTimeout, lastValidBlockHeightBuffer, resendInterval, confirmationCheckInterval, } = Object.assign(Object.assign({}, DEFAULT_OPTIONS), options);
    const txid = await connection.sendRawTransaction(serializedTransaction, sendOptions);
    const lastValidBlockHeight = blockhashWithExpiryBlockHeight.lastValidBlockHeight -
        lastValidBlockHeightBuffer;
    const resender = setInterval(async () => {
        try {
            await connection.sendRawTransaction(serializedTransaction, sendOptions);
        }
        catch (e) {
            console.warn(`Failed to resend transaction: ${e}`);
        }
    }, resendInterval);
    try {
        await (0, promise_retry_1.default)(async (retry, attempt) => {
            const response = await connection.getSignatureStatuses([txid]);
            const status = response.value[0];
            if (!status) {
                retry(new Error("Transaction status not found"));
            }
            else if (status.confirmationStatus !== "confirmed") {
                const blockHeight = await connection.getBlockHeight();
                if (blockHeight > lastValidBlockHeight) {
                    throw new web3_js_1.TransactionExpiredBlockheightExceededError(txid);
                }
                retry(new Error("Transaction not confirmed"));
            }
        }, {
            retries: confirmationRetries,
            minTimeout: confirmationRetryTimeout,
        });
    }
    catch (e) {
        if (e instanceof web3_js_1.TransactionExpiredBlockheightExceededError) {
            return null;
        }
        else {
            throw e;
        }
    }
    finally {
        clearInterval(resender);
    }
    const response = await connection.getTransaction(txid, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
    });
    return response;
}
exports.transactionSenderAndConfirmationWaiter = transactionSenderAndConfirmationWaiter;
