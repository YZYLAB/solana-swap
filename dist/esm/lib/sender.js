var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const DEFAULT_OPTIONS = {
    sendOptions: { skipPreflight: true },
    confirmationRetries: 30,
    confirmationRetryTimeout: 1000,
    lastValidBlockHeightBuffer: 150,
    resendInterval: 1000,
    confirmationCheckInterval: 1000,
    skipConfirmationCheck: false,
    commitment: "confirmed",
};
function transactionSenderAndConfirmationWaiter(_a) {
    return __awaiter(this, arguments, void 0, function* ({ connection, serializedTransaction, blockhashWithExpiryBlockHeight, options = DEFAULT_OPTIONS, }) {
        const { sendOptions, confirmationRetries, confirmationRetryTimeout, lastValidBlockHeightBuffer, resendInterval, confirmationCheckInterval, skipConfirmationCheck, commitment } = Object.assign(Object.assign({}, DEFAULT_OPTIONS), options);
        const lastValidBlockHeight = blockhashWithExpiryBlockHeight.lastValidBlockHeight -
            (lastValidBlockHeightBuffer || 150);
        let retryCount = 0;
        while (retryCount <= (confirmationRetries || 30)) {
            try {
                const signature = yield connection.sendRawTransaction(serializedTransaction, sendOptions);
                if (skipConfirmationCheck) {
                    return signature;
                }
                while (true) {
                    const status = yield connection.getSignatureStatus(signature);
                    if (status.value && status.value.confirmationStatus === commitment) {
                        return signature;
                    }
                    if (status.value && status.value.err) {
                        throw new Error(`Transaction failed: ${status.value.err}`);
                    }
                    yield new Promise((resolve) => setTimeout(resolve, confirmationCheckInterval));
                }
            }
            catch (error) {
                if (retryCount === confirmationRetries ||
                    error.message.includes("Transaction expired")) {
                    return new Error(error.message);
                }
                console.warn(`Retrying transaction: ${error.message}`);
                retryCount++;
                yield new Promise((resolve) => setTimeout(resolve, confirmationRetryTimeout));
                const blockHeight = yield connection.getBlockHeight();
                if (blockHeight > lastValidBlockHeight) {
                    return new Error("Transaction expired");
                }
            }
        }
        return new Error("Transaction failed after maximum retries");
    });
}
export { transactionSenderAndConfirmationWaiter };
