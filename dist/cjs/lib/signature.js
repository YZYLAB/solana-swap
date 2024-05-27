"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSignature = void 0;
const bs58_1 = __importDefault(require("bs58"));
function getSignature(transaction) {
    const signature = "signature" in transaction
        ? transaction.signature
        : transaction.signatures[0];
    if (!signature) {
        throw new Error("Missing transaction signature, the transaction was not signed by the fee payer");
    }
    return bs58_1.default.encode(signature);
}
exports.getSignature = getSignature;
