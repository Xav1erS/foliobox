export interface CreateOrderParams {
  orderId: string;
  planType: string;
  amount: number;
  currency: string;
  provider: string;
}

export type PaymentIntegrationMode = "stub" | "live";

export interface PaymentProvider {
  integrationMode: PaymentIntegrationMode;
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

function readBooleanEnv(value: string | undefined) {
  if (!value) return null;

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;

  return null;
}

export function areStubPaymentsAllowed() {
  const explicit = readBooleanEnv(process.env.ALLOW_STUB_PAYMENTS);
  if (explicit !== null) {
    return explicit;
  }

  return process.env.NODE_ENV !== "production";
}

export function isPaymentProviderEnabled(_provider: string, paymentProvider: PaymentProvider) {
  if (paymentProvider.integrationMode === "live") {
    return true;
  }

  return areStubPaymentsAllowed();
}

export function getPaymentProviderUnavailableMessage(provider: string) {
  return `支付通道 ${provider} 尚未完成生产配置，当前环境已禁用 stub 支付。`;
}
