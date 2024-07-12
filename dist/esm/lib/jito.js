var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import axios from "axios";
// Jito Tip Accounts: https://jito-labs.gitbook.io/mev/searcher-resources/json-rpc-api-reference/bundles/gettipaccounts
const tipAccounts = [
    "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
    "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
    "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
    "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
    "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
    "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
    "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
    "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT"
];
export function sendBundle(transactions) {
    return __awaiter(this, void 0, void 0, function* () {
        const bundleData = {
            jsonrpc: "2.0",
            id: 1,
            method: "sendBundle",
            params: [transactions],
        };
        try {
            const response = yield axios.post(`https://mainnet.block-engine.jito.wtf/api/v1/bundles`, bundleData, {
                headers: {
                    "Content-Type": "application/json",
                },
            });
            return response.data;
        }
        catch (error) {
            if (error === null || error === void 0 ? void 0 : error.response.data.error) {
                throw new Error(JSON.stringify(error === null || error === void 0 ? void 0 : error.response.data.error));
            }
            throw new Error("Failed to send bundle.");
        }
    });
}
export const createTipTransaction = (wallet, tip) => __awaiter(void 0, void 0, void 0, function* () {
    return new Transaction().add(SystemProgram.transfer({
        fromPubkey: new PublicKey(wallet),
        toPubkey: new PublicKey(tipAccounts[Math.floor(Math.random() * tipAccounts.length)]),
        lamports: tip * LAMPORTS_PER_SOL,
    }));
});
export function getBundleStatuses(bundleIds) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const bundleData = {
            jsonrpc: "2.0",
            id: 1,
            method: "getBundleStatuses",
            params: [bundleIds],
        };
        try {
            const response = yield axios.post(`https://mainnet.block-engine.jito.wtf/api/v1/bundles`, bundleData, {
                headers: {
                    "Content-Type": "application/json",
                },
            });
            return response.data;
        }
        catch (error) {
            if ((_b = (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) {
                throw new Error(JSON.stringify(error.response.data.error));
            }
            throw new Error("Failed to get bundle statuses.");
        }
    });
}
export function checkBundleStatus(bundleId_1) {
    return __awaiter(this, arguments, void 0, function* (bundleId, maxRetries = 10, commitmentLevel = 'confirmed', retryInterval = 1000) {
        let retries = 0;
        while (retries < maxRetries) {
            try {
                const response = yield getBundleStatuses([bundleId]);
                const bundleInfo = response.result.value.find((bundle) => bundle.bundle_id === bundleId);
                if (!bundleInfo) {
                    yield new Promise(resolve => setTimeout(resolve, retryInterval));
                }
                const status = bundleInfo.confirmation_status;
                const isStatusSufficient = (commitmentLevel === 'processed' && ['processed', 'confirmed', 'finalized'].includes(status)) ||
                    (commitmentLevel === 'confirmed' && ['confirmed', 'finalized'].includes(status)) ||
                    (commitmentLevel === 'finalized' && status === 'finalized');
                if (isStatusSufficient) {
                    if (bundleInfo.err.Ok === null) {
                        return bundleInfo.transactions[0];
                    }
                    else {
                        throw new Error('Jito Bundle Error:' + JSON.stringify(bundleInfo.err));
                    }
                }
                yield new Promise(resolve => setTimeout(resolve, retryInterval));
                retries++;
            }
            catch (error) {
                yield new Promise(resolve => setTimeout(resolve, retryInterval));
                retries++;
            }
        }
        throw new Error('Max retries reached while checking bundle status.');
    });
}
