import { createTransport } from "nodemailer";
import type { Theme } from "@auth/core/types";
import type { NodemailerConfig } from "@auth/core/providers/nodemailer";
import { getConfiguredAppHost, normalizeUrlToConfiguredOrigin } from "@/lib/app-url";

function buildEmailHtml(params: { url: string; host: string; expires: Date }) {
  const { url, host, expires } = params;
  const expiresText = new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    month: "numeric",
    day: "numeric",
  }).format(expires);

  return `
  <body style="margin:0;background:#f5f1e8;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fffdf8;border-radius:24px;overflow:hidden;border:1px solid #e8dcc8;">
      <tr>
        <td style="padding:32px 32px 20px;background:linear-gradient(135deg,#f7e1b5 0%,#f3c76d 100%);">
          <div style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#6b4f1d;">FolioBox</div>
          <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2;color:#3b2a14;">登录集盒 FolioBox</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 32px 32px;">
          <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#4b5563;">
            点击下方按钮即可安全登录 <strong style="color:#111827;">${host}</strong>，并返回你刚才的流程继续操作。
          </p>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.8;color:#6b7280;">
            这封邮件由你主动触发。链接将于 <strong>${expiresText}</strong> 前有效。
          </p>
          <p style="margin:0 0 28px;">
            <a href="${url}" target="_blank" rel="noreferrer" style="display:inline-block;border-radius:999px;background:#111827;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 24px;">打开登录链接</a>
          </p>
          <div style="padding:14px 16px;border-radius:16px;background:#f6efe2;font-size:12px;line-height:1.8;color:#6b7280;">
            建议直接在当前浏览器中打开邮件里的按钮。如果是邮箱 App 内置浏览器、无痕窗口或另一台设备，可能无法继承原来的登录状态。
          </div>
          <p style="margin:24px 0 0;font-size:12px;line-height:1.8;color:#9ca3af;word-break:break-all;">
            如果按钮无法打开，可以复制这条备用链接到浏览器地址栏：<br />
            <a href="${url}" target="_blank" rel="noreferrer" style="color:#6b4f1d;">${url}</a>
          </p>
        </td>
      </tr>
    </table>
  </body>
  `;
}

function buildEmailText(params: { url: string; host: string; expires: Date }) {
  const { url, host, expires } = params;
  const expiresText = new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    month: "numeric",
    day: "numeric",
  }).format(expires);

  return [
    `登录集盒 FolioBox (${host})`,
    "",
    "点击下面的链接即可登录，并返回你刚才的流程继续操作：",
    url,
    "",
    `链接有效期至：${expiresText}`,
    "如果这不是你发起的请求，可以直接忽略这封邮件。",
  ].join("\n");
}

export async function sendMagicLinkEmail(params: {
  identifier: string;
  url: string;
  expires: Date;
  provider: NodemailerConfig;
  theme: Theme;
}) {
  const normalizedUrl = normalizeUrlToConfiguredOrigin(params.url);
  const host = getConfiguredAppHost() ?? new URL(normalizedUrl).host;
  const transport = createTransport(params.provider.server);

  const result = await transport.sendMail({
    to: params.identifier,
    from: params.provider.from,
    subject: `登录 ${host}`,
    text: buildEmailText({
      url: normalizedUrl,
      host,
      expires: params.expires,
    }),
    html: buildEmailHtml({
      url: normalizedUrl,
      host,
      expires: params.expires,
    }),
  });

  const rejected = result.rejected || [];
  const pending = result.pending || [];
  const failed = rejected.concat(pending).filter(Boolean);
  if (failed.length) {
    throw new Error(`Email (${failed.join(", ")}) could not be sent`);
  }
}
