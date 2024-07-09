export interface RateResponse {
    amountIn: number;
    amountOut: number;
    minAmountOut: number;
    currentPrice: number;
    executionPrice: number;
    priceImpact: number;
    fee: number;
    baseCurrency: {
        decimals: number;
        mint: string;
    };
    quoteCurrency: {
        decimals: number;
        mint: string;
    };
    platformFee: number;
    platformFeeUI: number;
    rawQuoteResponse: any;
}
export interface SwapResponse {
    txn: string;
    txVersion: string;
    rate: RateResponse;
    forceLegacy?: boolean;
}
