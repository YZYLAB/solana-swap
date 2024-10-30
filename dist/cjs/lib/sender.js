"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionSenderAndConfirmationWaiter = exports.COMMITMENT_LEVELS = void 0;
class TransactionError extends Error {
    constructor(message, signature) {
        super(message);
        this.name = 'TransactionError';
        this.signature = signature;
    }
}
exports.COMMITMENT_LEVELS = {
    processed: 0,
    confirmed: 1,
    finalized: 2,
    recent: 0, // Equivalent to 'processed'
    single: 1, // Equivalent to 'confirmed'
    singleGossip: 1, // Equivalent to 'confirmed'
    root: 2, // Equivalent to 'finalized'
    max: 2, // Equivalent to 'finalized'
};
const DEFAULT_OPTIONS = {
    sendOptions: { skipPreflight: true },
    confirmationRetries: 30,
    confirmationRetryTimeout: 1000,
    lastValidBlockHeightBuffer: 150,
    resendInterval: 1000,
    confirmationCheckInterval: 1000,
    skipConfirmationCheck: false,
    commitment: "processed",
    jito: {
        enabled: false,
        tip: 0,
    }
};
function transactionSenderAndConfirmationWaiter(_a) {
    return __awaiter(this, arguments, void 0, function* ({ connection, serializedTransaction, blockhashWithExpiryBlockHeight, options = DEFAULT_OPTIONS, }) {
        const { sendOptions, confirmationRetries, confirmationRetryTimeout, lastValidBlockHeightBuffer, resendInterval, confirmationCheckInterval, skipConfirmationCheck, commitment } = Object.assign(Object.assign({}, DEFAULT_OPTIONS), options);
        const lastValidBlockHeight = blockhashWithExpiryBlockHeight.lastValidBlockHeight +
            (lastValidBlockHeightBuffer || 150);
        // Send the transaction initially
        let signature;
        try {
            signature = yield connection.sendRawTransaction(serializedTransaction, sendOptions);
        }
        catch (error) {
            throw new TransactionError(`Failed to send transaction: ${error.message}`, '');
        }
        if (skipConfirmationCheck) {
            return signature;
        }
        // Set up transaction resend interval
        const resendIntervalId = resendInterval ? setInterval(() => __awaiter(this, void 0, void 0, function* () {
            try {
                yield connection.sendRawTransaction(serializedTransaction, sendOptions);
            }
            catch (error) { }
        }), resendInterval < 1000 ? 1000 : resendInterval) : null;
        // Loop for confirmation check
        let retryCount = 0;
        while (retryCount <= (confirmationRetries || 30)) {
            try {
                const status = yield connection.getSignatureStatus(signature);
                if (status.value && status.value.confirmationStatus) {
                    if (resendIntervalId) {
                        clearInterval(resendIntervalId);
                    }
                }
                if (status.value && status.value.confirmationStatus &&
                    exports.COMMITMENT_LEVELS[status.value.confirmationStatus] >= exports.COMMITMENT_LEVELS[commitment]) {
                    if (resendIntervalId) {
                        clearInterval(resendIntervalId);
                    }
                    return signature;
                }
                if (status.value && status.value.err) {
                    if (resendIntervalId) {
                        clearInterval(resendIntervalId);
                    }
                    throw new TransactionError(`Transaction failed: ${status.value.err}`, signature);
                }
                const blockHeight = yield connection.getBlockHeight();
                if (blockHeight > lastValidBlockHeight) {
                    if (resendIntervalId) {
                        clearInterval(resendIntervalId);
                    }
                    throw new TransactionError("Transaction expired", signature);
                }
                yield new Promise((resolve) => setTimeout(resolve, confirmationCheckInterval));
                retryCount++;
            }
            catch (error) {
                if (resendIntervalId) {
                    clearInterval(resendIntervalId);
                }
                if (error instanceof TransactionError) {
                    throw error;
                }
                throw new TransactionError(`Confirmation check failed: ${error.message}`, signature);
            }
        }
        if (resendIntervalId) {
            clearInterval(resendIntervalId);
        }
        throw new TransactionError("Transaction failed after maximum retries", signature);
    });
}
exports.transactionSenderAndConfirmationWaiter = transactionSenderAndConfirmationWaiter;
