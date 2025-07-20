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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolanaTracker = void 0;
const bs58_1 = __importDefault(require("bs58"));
const web3_js_1 = require("@solana/web3.js");
const https_1 = require("https");
const http_1 = require("http");
const sender_1 = require("./lib/sender.js");
const jito_1 = require("./lib/jito.js");
class SolanaTracker {
    constructor(keypair, rpc, apiKey, debug = false) {
        this.baseUrl = "https://swap-v2.solanatracker.io";
        this.debug = false;
        // Custom send endpoint properties
        this.customSendConnection = null;
        this.customSendEndpoint = null;
        this.keepAliveInterval = null;
        this.customHeaders = {};
        this.keypair = keypair;
        this.apiKey = apiKey || "";
        this.debug = debug;
        // Create appropriate HTTP agent
        const isHttps = rpc.toLowerCase().startsWith("https://");
        const agentOptions = {
            keepAlive: true,
            keepAliveMsecs: 10000,
            maxSockets: 50,
        };
        this.httpAgent = isHttps ? new https_1.Agent(agentOptions) : new http_1.Agent(agentOptions);
        // Create connection
        this.connection = this.createConnection(rpc);
    }
    createConnection(rpc) {
        // Handle WebSocket endpoint
        let wsEndpoint;
        if (rpc.toLowerCase().startsWith("https://")) {
            wsEndpoint = rpc.replace(/^https:\/\//i, "wss://");
        }
        else if (rpc.toLowerCase().startsWith("http://")) {
            wsEndpoint = rpc.replace(/^http:\/\//i, "ws://");
        }
        else {
            wsEndpoint = `wss://${rpc}`;
            rpc = `https://${rpc}`;
        }
        const connectionConfig = {
            commitment: "confirmed",
            httpAgent: this.httpAgent,
            disableRetryOnRateLimit: false,
            wsEndpoint,
        };
        return new web3_js_1.Connection(rpc, connectionConfig);
    }
    log(...args) {
        if (this.debug) {
            console.log("[SolanaTracker]", ...args);
        }
    }
    logError(...args) {
        if (this.debug) {
            console.error("[SolanaTracker]", ...args);
        }
    }
    setBaseUrl(url) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!url.match(/^https?:\/\//i)) {
                url = `https://${url}`;
            }
            this.baseUrl = url;
        });
    }
    /**
     * Set a custom endpoint for sending transactions
     * Maintains a warm connection by sending keep-alive requests every 5 seconds
     * @param endpoint - Custom RPC endpoint URL for sending transactions
     * @param headers - Optional custom headers to include with requests
     */
    setCustomSendTransactionEndpoint(endpoint, headers) {
        return __awaiter(this, void 0, void 0, function* () {
            // Clear existing keep-alive interval
            if (this.keepAliveInterval) {
                clearInterval(this.keepAliveInterval);
                this.keepAliveInterval = null;
            }
            // Clear existing custom connection
            if (this.customSendConnection) {
                this.customSendConnection = null;
            }
            if (!endpoint) {
                this.customSendEndpoint = null;
                this.customHeaders = {};
                this.log("Custom send endpoint cleared");
                return;
            }
            try {
                // Store custom headers
                this.customHeaders = headers || {};
                // Create custom connection for sending
                const isHttps = endpoint.toLowerCase().startsWith("https://");
                const agentOptions = {
                    keepAlive: true,
                    keepAliveMsecs: 10000,
                    maxSockets: 50,
                };
                const customAgent = isHttps ? new https_1.Agent(agentOptions) : new http_1.Agent(agentOptions);
                // Create connection with custom headers
                this.customSendConnection = new web3_js_1.Connection(endpoint, {
                    commitment: "processed",
                    httpAgent: customAgent,
                    httpHeaders: this.customHeaders,
                });
                this.customSendEndpoint = endpoint;
                this.log("Custom send endpoint set:", endpoint);
                if (Object.keys(this.customHeaders).length > 0) {
                    this.log("Custom headers configured:", Object.keys(this.customHeaders));
                }
                // Start keep-alive interval with simple HTTP GET
                this.keepAliveInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
                    try {
                        // Simple GET request to keep connection warm
                        const controller = new AbortController();
                        const timeout = setTimeout(() => controller.abort(), 5000);
                        yield fetch(endpoint, {
                            method: 'GET',
                            signal: controller.signal,
                            headers: Object.assign({ 'User-Agent': 'SolanaTracker/1.0' }, this.customHeaders),
                        });
                        clearTimeout(timeout);
                        this.log("Keep-alive ping sent");
                    }
                    catch (error) {
                        // Ignore errors - endpoint might not support GET
                        this.log("Keep-alive ping failed (ignored)");
                    }
                }), 5000);
                // Do initial ping (ignore errors)
                try {
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 5000);
                    yield fetch(endpoint, {
                        method: 'GET',
                        signal: controller.signal,
                        headers: Object.assign({ 'User-Agent': 'SolanaTracker/1.0' }, this.customHeaders),
                    });
                    clearTimeout(timeout);
                    this.log("Custom send endpoint is reachable");
                }
                catch (error) {
                    // Ignore initial ping errors
                    this.log("Initial ping failed (ignored) - endpoint may not support GET requests");
                }
            }
            catch (error) {
                this.logError("Failed to set custom endpoint:", error);
                throw error;
            }
        });
    }
    getCustomSendEndpoint() {
        return this.customSendEndpoint;
    }
    fetchWithRetry(url_1) {
        return __awaiter(this, arguments, void 0, function* (url, options = {}, retries = 3) {
            let lastError = null;
            for (let i = 0; i < retries; i++) {
                try {
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 30000);
                    const response = yield fetch(url, Object.assign(Object.assign({}, options), { signal: controller.signal, headers: Object.assign({ "Content-Type": "application/json", "x-api-key": this.apiKey }, options.headers) }));
                    clearTimeout(timeout);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}, message: ${yield response.text()}`);
                    }
                    return response;
                }
                catch (error) {
                    lastError = error;
                    if (i < retries - 1) {
                        yield new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                    }
                }
            }
            throw lastError || new Error("Failed to fetch after retries");
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
                const response = yield this.fetchWithRetry(url);
                return yield response.json();
            }
            catch (error) {
                throw new Error(`Failed to get rate: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
        });
    }
    getSwapInstructions(from, to, fromAmount, slippage, payer, priorityFee, forceLegacy, additionalOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryParams = new URLSearchParams({
                from,
                to,
                fromAmount: fromAmount.toString(),
                slippage: slippage.toString(),
                payer,
            });
            // Handle legacy parameters
            if (priorityFee !== undefined) {
                queryParams.append("priorityFee", priorityFee.toString());
            }
            if (forceLegacy) {
                queryParams.append("txVersion", "legacy");
            }
            // Add additional options
            if (additionalOptions) {
                if (additionalOptions.priorityFeeLevel) {
                    queryParams.append("priorityFeeLevel", additionalOptions.priorityFeeLevel);
                }
                if (additionalOptions.txVersion) {
                    queryParams.append("txVersion", additionalOptions.txVersion);
                }
                if (additionalOptions.feeType) {
                    queryParams.append("feeType", additionalOptions.feeType);
                }
                if (additionalOptions.onlyDirectRoutes !== undefined) {
                    queryParams.append("onlyDirectRoutes", additionalOptions.onlyDirectRoutes.toString());
                }
                if (additionalOptions.fee) {
                    queryParams.append("fee", `${additionalOptions.fee.wallet}:${additionalOptions.fee.percentage}`);
                }
                if (additionalOptions.customTip) {
                    queryParams.append("customTip", `${additionalOptions.customTip.wallet}:${additionalOptions.customTip.amount}`);
                }
                if (!additionalOptions.txVersion && !forceLegacy) {
                    queryParams.append("txVersion", 'v0');
                }
            }
            else if (!forceLegacy) {
                queryParams.append("txVersion", "v0");
            }
            const url = `${this.baseUrl}/swap?${queryParams}`;
            this.log("Swap URL:", url);
            try {
                const response = yield this.fetchWithRetry(url);
                return yield response.json();
            }
            catch (error) {
                throw new Error(`Failed to get swap instructions: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
        });
    }
    confirmTransactionWithPolling(signature_1) {
        return __awaiter(this, arguments, void 0, function* (signature, commitment = "confirmed", maxRetries = 30, retryInterval = 1000) {
            let retries = 0;
            while (retries < maxRetries) {
                try {
                    const status = yield this.connection.getSignatureStatus(signature);
                    if (status.value !== null) {
                        if (status.value.err) {
                            return { confirmed: false, err: status.value.err, slot: status.value.slot };
                        }
                        if (status.value.confirmationStatus === commitment ||
                            status.value.confirmationStatus === "finalized" || (commitment === 'processed' && status.value.confirmationStatus === 'confirmed')) {
                            return { confirmed: true, slot: status.value.slot };
                        }
                    }
                    yield new Promise(resolve => setTimeout(resolve, retryInterval));
                    retries++;
                }
                catch (error) {
                    this.logError(`Error checking transaction status (attempt ${retries + 1}):`, error);
                    retries++;
                    yield new Promise(resolve => setTimeout(resolve, retryInterval));
                }
            }
            return { confirmed: false, err: "Confirmation timeout" };
        });
    }
    confirmTransactionWithSubscription(signature_1) {
        return __awaiter(this, arguments, void 0, function* (signature, commitment = "confirmed", timeout = 30000) {
            return new Promise((resolve) => {
                let subscriptionId = null;
                let timeoutId = null;
                const cleanup = () => {
                    if (subscriptionId !== null) {
                        this.connection.removeSignatureListener(subscriptionId);
                    }
                    if (timeoutId !== null) {
                        clearTimeout(timeoutId);
                    }
                };
                timeoutId = setTimeout(() => {
                    cleanup();
                    resolve({ confirmed: false, err: "Confirmation timeout" });
                }, timeout);
                subscriptionId = this.connection.onSignature(signature, (result, context) => {
                    cleanup();
                    if (result.err) {
                        resolve({ confirmed: false, err: result.err, slot: context.slot });
                    }
                    else {
                        resolve({ confirmed: true, slot: context.slot });
                    }
                }, commitment);
                // Check immediately in case already confirmed
                this.connection.getSignatureStatus(signature).then((status) => {
                    if (status.value !== null) {
                        if (status.value.err) {
                            cleanup();
                            resolve({ confirmed: false, err: status.value.err, slot: status.value.slot });
                        }
                        else if (status.value.confirmationStatus === commitment ||
                            status.value.confirmationStatus === "finalized") {
                            cleanup();
                            resolve({ confirmed: true, slot: status.value.slot });
                        }
                    }
                }).catch((error) => {
                    this.logError("Error checking initial status:", error);
                });
            });
        });
    }
    parseTransactionError(signature) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const parsedTx = yield this.connection.getParsedTransaction(signature, {
                    commitment: "confirmed",
                    maxSupportedTransactionVersion: 0,
                });
                if (!parsedTx || !parsedTx.meta || !parsedTx.meta.err) {
                    return null;
                }
                const error = parsedTx.meta.err;
                if (typeof error === "object" && "InstructionError" in error) {
                    // Ensure InstructionError is an array before destructuring
                    const instructionErrorArray = error.InstructionError;
                    if (Array.isArray(instructionErrorArray) && instructionErrorArray.length >= 2) {
                        const index = instructionErrorArray[0];
                        const instructionError = instructionErrorArray[1];
                        const instruction = parsedTx.transaction.message.instructions[index];
                        const programId = instruction.programId.toString();
                        return {
                            type: "InstructionError",
                            message: `Instruction ${index} failed: ${JSON.stringify(instructionError)}`,
                            instructionIndex: index,
                            programId,
                            rawError: error,
                        };
                    }
                    // Handle case where InstructionError doesn't have expected format
                    return {
                        type: "InstructionError",
                        message: `Instruction error: ${JSON.stringify(error.InstructionError)}`,
                        rawError: error,
                    };
                }
                if (error === "InsufficientFundsForRent") {
                    return {
                        type: "InsufficientFunds",
                        message: "Insufficient funds for rent",
                        rawError: error,
                    };
                }
                if (error === "AccountNotFound") {
                    return {
                        type: "AccountNotFound",
                        message: "Required account not found",
                        rawError: error,
                    };
                }
                if (parsedTx.meta.logMessages) {
                    const errorLog = parsedTx.meta.logMessages.find(log => log.includes("Error") || log.includes("failed") || log.includes("Failed"));
                    if (errorLog) {
                        return {
                            type: "ProgramError",
                            message: errorLog,
                            rawError: error,
                        };
                    }
                }
                return {
                    type: "Unknown",
                    message: `Unknown error: ${JSON.stringify(error)}`,
                    rawError: error,
                };
            }
            catch (err) {
                this.logError("Failed to parse transaction error:", err);
                return {
                    type: "Unknown",
                    message: "Failed to parse transaction error",
                    rawError: err,
                };
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
            var _a, _b, _c, _d, _e, _f, _g, _h;
            if (options.debug !== undefined) {
                this.debug = options.debug;
            }
            // Deserialize transaction
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
            if (swapResponse.type === 'v0') {
                txn = web3_js_1.VersionedTransaction.deserialize(serializedTransactionBuffer);
                txn.sign([this.keypair]);
            }
            else {
                txn = web3_js_1.Transaction.from(serializedTransactionBuffer);
                txn.sign(this.keypair);
            }
            let txid;
            try {
                // Send transaction
                if ((_a = options.jito) === null || _a === void 0 ? void 0 : _a.enabled) {
                    // Jito bundle
                    const transactions = [bs58_1.default.encode(txn.serialize())];
                    const tipTxn = yield (0, jito_1.createTipTransaction)(this.keypair.publicKey.toBase58(), options.jito.tip || 0);
                    tipTxn.recentBlockhash = blockhash.blockhash;
                    tipTxn.sign(this.keypair);
                    transactions.push(bs58_1.default.encode(tipTxn.serialize()));
                    const response = yield (0, jito_1.sendBundle)(transactions);
                    if (!response.result) {
                        throw new Error("Failed to send Jito bundle");
                    }
                    txid = yield (0, jito_1.checkBundleStatus)(response.result, options.confirmationRetries, options.commitment, options.confirmationCheckInterval);
                }
                else if (this.customSendConnection && this.customSendEndpoint) {
                    // Use custom send endpoint with direct fetch
                    this.log("Using custom send endpoint");
                    try {
                        // Prepare the RPC request
                        const rpcRequest = {
                            jsonrpc: "2.0",
                            id: 1,
                            method: "sendTransaction",
                            params: [
                                bs58_1.default.encode(txn.serialize()),
                                {
                                    encoding: "base58",
                                    skipPreflight: (_c = (_b = options.sendOptions) === null || _b === void 0 ? void 0 : _b.skipPreflight) !== null && _c !== void 0 ? _c : true,
                                    preflightCommitment: ((_d = options.sendOptions) === null || _d === void 0 ? void 0 : _d.preflightCommitment) || "processed",
                                    maxRetries: (_f = (_e = options.sendOptions) === null || _e === void 0 ? void 0 : _e.maxRetries) !== null && _f !== void 0 ? _f : 0,
                                    minContextSlot: (_g = options.sendOptions) === null || _g === void 0 ? void 0 : _g.minContextSlot,
                                }
                            ]
                        };
                        const response = yield fetch(this.customSendEndpoint, {
                            method: "POST",
                            headers: Object.assign({ "Content-Type": "application/json" }, this.customHeaders),
                            body: JSON.stringify(rpcRequest),
                        });
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        const result = yield response.json();
                        if (result.error) {
                            throw new Error(`RPC error: ${result.error.message || JSON.stringify(result.error)}`);
                        }
                        txid = result.result;
                        this.log("Transaction sent via custom endpoint:", txid);
                    }
                    catch (error) {
                        // If custom endpoint fails, fallback to main connection
                        this.logError("Custom send endpoint failed, falling back to main connection:", error);
                        txid = yield (0, sender_1.transactionSenderAndConfirmationWaiter)({
                            connection: this.connection,
                            serializedTransaction: txn.serialize(),
                            blockhashWithExpiryBlockHeight,
                            options: options,
                        });
                    }
                }
                else {
                    // Regular send
                    txid = yield (0, sender_1.transactionSenderAndConfirmationWaiter)({
                        connection: this.connection,
                        serializedTransaction: txn.serialize(),
                        blockhashWithExpiryBlockHeight,
                        options: options,
                    });
                }
                // Confirm if needed
                if (this.customSendConnection || ((_h = options.jito) === null || _h === void 0 ? void 0 : _h.enabled)) {
                    let confirmationResult;
                    if (options.useWebSocket) {
                        confirmationResult = yield this.confirmTransactionWithSubscription(txid, options.commitment || "confirmed", (options.confirmationRetries || 30) * (options.confirmationRetryTimeout || 1000));
                    }
                    else {
                        confirmationResult = yield this.confirmTransactionWithPolling(txid, options.commitment || "confirmed", options.confirmationRetries || 30, options.confirmationRetryTimeout || 1000);
                    }
                    if (!confirmationResult.confirmed) {
                        const error = yield this.parseTransactionError(txid);
                        const errorMessage = (error === null || error === void 0 ? void 0 : error.message) || "Failed to confirm";
                        throw new Error(`Transaction ${txid} failed: ${errorMessage}`);
                    }
                }
                return txid;
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                if (txid) {
                    const parsedError = yield this.parseTransactionError(txid);
                    if (parsedError) {
                        throw new Error(`Swap ${txid} failed: ${parsedError.message}`);
                    }
                    throw new Error(`Swap ${txid} failed: ${errorMessage}`);
                }
                throw new Error(`Swap failed: ${errorMessage}`);
            }
        });
    }
    performSwapWithDetails(swapResponse_1) {
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
            try {
                const signature = yield this.performSwap(swapResponse, options);
                return { signature };
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                const txidMatch = errorMessage.match(/([1-9A-HJ-NP-Za-km-z]{32,})/);
                if (txidMatch) {
                    const txid = txidMatch[0];
                    const parsedError = yield this.parseTransactionError(txid);
                    return {
                        signature: txid,
                        error: parsedError || {
                            type: "Unknown",
                            message: errorMessage,
                            rawError: error,
                        },
                    };
                }
                return {
                    signature: "",
                    error: {
                        type: "Unknown",
                        message: errorMessage,
                        rawError: error,
                    },
                };
            }
        });
    }
    getTransactionDetails(signature) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.connection.getParsedTransaction(signature, {
                    commitment: "confirmed",
                    maxSupportedTransactionVersion: 0,
                });
            }
            catch (error) {
                this.logError("Failed to get transaction details:", error);
                return null;
            }
        });
    }
    setDebug(enabled) {
        this.debug = enabled;
    }
    updateRpcEndpoint(rpc) {
        if (this.httpAgent) {
            this.httpAgent.destroy();
        }
        const isHttps = rpc.toLowerCase().startsWith("https://");
        const agentOptions = {
            keepAlive: true,
            keepAliveMsecs: 10000,
            maxSockets: 50,
        };
        this.httpAgent = isHttps ? new https_1.Agent(agentOptions) : new http_1.Agent(agentOptions);
        this.connection = this.createConnection(rpc);
    }
    destroy() {
        if (this.httpAgent) {
            this.httpAgent.destroy();
        }
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
        }
        this.customSendConnection = null;
        this.customSendEndpoint = null;
    }
}
exports.SolanaTracker = SolanaTracker;
