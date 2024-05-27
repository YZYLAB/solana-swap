var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "bs58"], factory);
    }
})(function (require, exports) {
    "use strict";
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
});
