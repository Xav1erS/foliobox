import type { PaymentProvider, CreateOrderParams } from "./index";

// TODO: Replace this stub with real WeChat Pay SDK integration.
// Requires merchant certificate, API v3 key, and APPID from WeChat Pay console.
export const wechatProvider: PaymentProvider = {
  integrationMode: "stub",
  async createOrder(params: CreateOrderParams) {
    return {
      providerOrderId: `wechat_stub_${params.orderId}`,
      paymentParams: {
        provider: "wechat_pay",
        stub: true,
        message: "WeChat Pay SDK not yet integrated. Configure merchant credentials first.",
      },
    };
  },

  async queryOrder(providerOrderId: string) {
    // Stub: always return pending until real SDK is integrated
    return { status: "pending" as const };
  },

  async verifyCallback(payload: unknown) {
    // Stub: real implementation requires WeChat Pay callback signature verification
    const p = payload as Record<string, string>;
    return { orderId: p.out_trade_no ?? "", status: p.trade_state ?? "pending" };
  },
};
