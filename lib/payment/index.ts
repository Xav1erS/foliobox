export interface CreateOrderParams {
  orderId: string;
  planType: string;
  amount: number;
  currency: string;
  provider: string;
}

export interface PaymentProvider {
  createOrder(
    params: CreateOrderParams
  ): Promise<{ providerOrderId: string; paymentParams: unknown }>;
  queryOrder(
    providerOrderId: string
  ): Promise<{ status: "paid" | "pending" | "failed" }>;
  verifyCallback(
    payload: unknown
  ): Promise<{ orderId: string; status: string }>;
}

export function getProvider(provider: string): PaymentProvider {
  if (provider === "wechat_pay") {
    return require("./wechat").wechatProvider;
  }
  if (provider === "alipay") {
    return require("./alipay").alipayProvider;
  }
  throw new Error(`Unknown payment provider: ${provider}`);
}
