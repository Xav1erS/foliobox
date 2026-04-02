import type { PaymentProvider, CreateOrderParams } from "./index";

// TODO: Replace this stub with real Alipay SDK integration.
// Requires Alipay app private key, Alipay public key, and App ID from Alipay Open Platform.
export const alipayProvider: PaymentProvider = {
  async createOrder(params: CreateOrderParams) {
    return {
      providerOrderId: `alipay_stub_${params.orderId}`,
      paymentParams: {
        provider: "alipay",
        stub: true,
        message: "Alipay SDK not yet integrated. Configure app credentials first.",
      },
    };
  },

  async queryOrder(providerOrderId: string) {
    // Stub: always return pending until real SDK is integrated
    return { status: "pending" as const };
  },

  async verifyCallback(payload: unknown) {
    // Stub: real implementation requires Alipay RSA signature verification
    const p = payload as Record<string, string>;
    return { orderId: p.out_trade_no ?? "", status: p.trade_status ?? "pending" };
  },
};
