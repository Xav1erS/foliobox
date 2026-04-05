import { createTransport } from "nodemailer";
import type { Theme } from "@auth/core/types";
import type { NodemailerConfig } from "@auth/core/providers/nodemailer";
import { getConfiguredAppHost, normalizeUrlToConfiguredOrigin } from "@/lib/app-url";

export type AuthEmailVariant = "hero-shell" | "product-panel";

type MagicLinkEmailRenderParams = {
  url: string;
  host: string;
  expires: Date;
};

function formatExpires(expires: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    month: "numeric",
    day: "numeric",
  }).format(expires);
}

function wrapEmailDocument(content: string) {
  return `
  <!DOCTYPE html>
  <html lang="zh-CN">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="color-scheme" content="light dark" />
      <meta name="supported-color-schemes" content="light dark" />
      <title>集盒 FolioBox 登录邮件</title>
    </head>
    ${content}
  </html>
  `;
}

function buildHeroShellEmailHtml(params: MagicLinkEmailRenderParams) {
  const { url, host, expires } = params;
  const expiresText = formatExpires(expires);

  return wrapEmailDocument(`
  <body style="margin:0;background-color:#020202;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#ffffff;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:#020202;">
      <tr>
        <td align="center" bgcolor="#020202">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#050505" style="max-width:620px;margin:0 auto;border-collapse:separate;border-spacing:0;border-radius:0;overflow:hidden;border:1px solid #1f1f1f;background-color:#050505;background-image:linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);background-size:80px 80px;box-shadow:0 24px 80px rgba(0,0,0,0.45);">
      <tr>
        <td bgcolor="#050505" style="padding:18px 24px;border-bottom:1px solid #171717;background-color:rgba(5,5,5,0.9);">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:15px;font-weight:600;letter-spacing:-0.02em;color:#ffffff;">集盒 FolioBox</td>
              <td align="right" style="font-size:12px;color:#7c7c7c;">安全登录邮件</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td bgcolor="#050505" style="padding:36px 28px 18px;background-color:transparent;background-image:radial-gradient(ellipse 80% 50% at 50% -20%, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0) 100%);">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:0;">
            <tr>
              <td style="border:1px solid #2a2a2a;border-radius:0;background-color:#151515;padding:8px 14px;font-size:12px;color:#b8b8b8;">
                <span style="display:inline-block;height:8px;width:8px;border-radius:999px;background:#34d399;margin-right:8px;vertical-align:middle;"></span>
                <span style="vertical-align:middle;">登录后继续当前流程</span>
              </td>
            </tr>
          </table>
          <h1 style="margin:28px 0 0;font-size:42px;line-height:1.08;letter-spacing:-0.04em;font-weight:800;color:#ffffff;">
            登录集盒
            <br />
            <span style="color:#6f6f6f;">继续你的作品集整理</span>
          </h1>
          <p style="margin:24px 0 0;font-size:17px;line-height:1.85;color:#b8b8b8;">
            点击下方按钮即可安全登录 <strong style="color:#ffffff;font-weight:600;">${host}</strong>，并返回你刚才的评分、项目或支付流程继续操作。
          </p>
          <p style="margin:14px 0 0;font-size:14px;line-height:1.8;color:#7c7c7c;">
            这封邮件由你主动触发。链接将于 <strong style="color:#d0d0d0;font-weight:600;">${expiresText}</strong> 前有效。
          </p>
        </td>
      </tr>
      <tr>
        <td bgcolor="#050505" style="padding:0 28px 32px;background-color:transparent;">
          <div style="position:relative;border-radius:0;border:1px solid #1f1f1f;background-color:#0a0a0a;padding:28px;">
            <div
              style="position:absolute;top:18px;right:18px;width:96px;height:52px;background-image:radial-gradient(#343434 0.95px, transparent 0.95px);background-size:12px 12px;opacity:0.7;"
            ></div>
            <p style="margin:0 0 24px;">
              <a href="${url}" target="_blank" rel="noreferrer" style="display:inline-block;border-radius:0;background:#ffffff;color:#000000;text-decoration:none;font-size:14px;font-weight:700;padding:14px 22px;">打开登录链接 →</a>
            </p>
            <div style="padding:16px 18px;border-radius:0;border:1px solid #1d1d1d;background-color:#181818;font-size:12px;line-height:1.9;color:#9b9b9b;">
              建议直接在当前浏览器中打开邮件里的按钮。如果是邮箱 App 内置浏览器、无痕窗口或另一台设备，可能无法继承原来的登录状态。
            </div>
            <div style="margin-top:24px;font-size:12px;line-height:1.9;color:#7c7c7c;">
              如果按钮无法打开，可以复制这条备用链接到浏览器地址栏：
            </div>
            <div style="margin-top:10px;border-radius:0;border:1px solid #1d1d1d;background-color:#111111;padding:16px 18px;word-break:break-all;">
              <a href="${url}" target="_blank" rel="noreferrer" style="font-size:12px;line-height:1.9;color:#b8b8b8;text-decoration:none;">${url}</a>
            </div>
            <div style="margin-top:24px;padding-top:20px;border-top:1px solid #1d1d1d;font-size:12px;line-height:1.8;color:#6d6d6d;">
              如果这不是你发起的登录请求，可以直接忽略这封邮件。
            </div>
            <div
              style="margin-top:18px;height:28px;background-image:linear-gradient(to bottom, rgba(10,10,10,0.94) 0%, rgba(10,10,10,0.58) 42%, rgba(10,10,10,0) 100%), radial-gradient(#303030 0.95px, transparent 0.95px);background-size:auto, 12px 12px;"
            ></div>
          </div>
        </td>
      </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  `);
}

function buildProductPanelEmailHtml(params: MagicLinkEmailRenderParams) {
  const { url, host, expires } = params;
  const expiresText = formatExpires(expires);

  return wrapEmailDocument(`
  <body style="margin:0;background-color:#020202;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#ffffff;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:#020202;">
      <tr>
        <td align="center" bgcolor="#020202">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#050505" style="max-width:620px;margin:0 auto;border-collapse:separate;border-spacing:0;border-radius:0;overflow:hidden;border:1px solid #1f1f1f;background:#050505;background-image:linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);background-size:80px 80px;box-shadow:0 24px 80px rgba(0,0,0,0.48);">
      <tr>
        <td bgcolor="#0a0a0a" style="padding:16px 20px;border-bottom:1px solid #171717;background-color:rgba(10,10,10,0.9);">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="display:inline-block;height:10px;width:10px;border-radius:999px;background:#2f2f2f;margin-right:6px;"></span>
                <span style="display:inline-block;height:10px;width:10px;border-radius:999px;background:#2f2f2f;margin-right:6px;"></span>
                <span style="display:inline-block;height:10px;width:10px;border-radius:999px;background:#2f2f2f;margin-right:10px;"></span>
                <span style="font-size:13px;color:#7c7c7c;">foliobox.art/auth/preview</span>
              </td>
              <td align="right" style="font-size:13px;font-weight:600;color:#ffffff;">集盒 FolioBox</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td bgcolor="#050505" style="padding:28px 24px 32px;background-color:transparent;">
          <div style="border-radius:0;border:1px solid #1f1f1f;background-color:#0a0a0a;overflow:hidden;">
            <div style="padding:24px 24px 18px;border-bottom:1px solid #171717;background-color:#0d0d0d;background-image:radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 58%);">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:0;">
                <tr>
                  <td style="border-radius:0;border:1px solid #262626;background-color:#151515;padding:7px 12px;font-size:12px;color:#b8b8b8;">
                    <span style="display:inline-block;height:8px;width:8px;border-radius:999px;background:#34d399;margin-right:8px;vertical-align:middle;"></span>
                    <span style="vertical-align:middle;">Magic Link 登录</span>
                  </td>
                </tr>
              </table>
              <h1 style="margin:18px 0 0;font-size:34px;line-height:1.12;letter-spacing:-0.04em;font-weight:800;color:#ffffff;">
                回到你的
                <span style="color:#6f6f6f;">作品集流程</span>
              </h1>
              <p style="margin:18px 0 0;font-size:15px;line-height:1.9;color:#b8b8b8;">
                这次登录会进入 <strong style="color:#ffffff;font-weight:600;">${host}</strong>，并继续你刚才正在进行的整理任务。
              </p>
            </div>
            <div style="padding:22px 24px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;">
                <tr>
                  <td style="padding:0 0 14px;font-size:12px;color:#7c7c7c;">当前状态</td>
                  <td align="right" style="padding:0 0 14px;font-size:12px;color:#b8b8b8;">待验证</td>
                </tr>
                <tr>
                  <td style="padding:14px 0;border-top:1px solid #171717;font-size:12px;color:#7c7c7c;">链接有效期</td>
                  <td align="right" style="padding:14px 0;border-top:1px solid #171717;font-size:12px;color:#b8b8b8;">${expiresText}</td>
                </tr>
              </table>
              <p style="margin:0 0 18px;">
                <a href="${url}" target="_blank" rel="noreferrer" style="display:inline-block;border-radius:0;background:#ffffff;color:#000000;text-decoration:none;font-size:14px;font-weight:700;padding:14px 22px;">继续登录 →</a>
              </p>
              <div style="border-radius:0;border:1px solid #1d1d1d;background-color:#181818;padding:16px 18px;font-size:12px;line-height:1.9;color:#9b9b9b;">
                如果你是在邮箱 App 内置浏览器、无痕窗口或另一台设备里打开邮件，可能无法继承当前浏览器中的登录状态。
              </div>
              <div style="margin-top:18px;font-size:12px;line-height:1.9;color:#7c7c7c;">
                备用链接：
              </div>
              <div style="margin-top:8px;word-break:break-all;">
                <a href="${url}" target="_blank" rel="noreferrer" style="font-size:12px;line-height:1.9;color:#b8b8b8;text-decoration:none;">${url}</a>
              </div>
            </div>
          </div>
        </td>
      </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  `);
}

function buildEmailHtml(params: MagicLinkEmailRenderParams & { variant: AuthEmailVariant }) {
  const { variant, ...rest } = params;

  if (variant === "product-panel") {
    return buildProductPanelEmailHtml(rest);
  }

  return buildHeroShellEmailHtml(rest);
}

function resolveAuthEmailVariant(): AuthEmailVariant {
  return process.env.AUTH_EMAIL_VARIANT === "product-panel"
    ? "product-panel"
    : "hero-shell";
}

export function getMagicLinkEmailHtml(params: MagicLinkEmailRenderParams & { variant?: AuthEmailVariant }) {
  return buildEmailHtml({
    ...params,
    variant: params.variant ?? resolveAuthEmailVariant(),
  });
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
  const html = getMagicLinkEmailHtml({
    url: normalizedUrl,
    host,
    expires: params.expires,
  });

  const result = await transport.sendMail({
    to: params.identifier,
    from: params.provider.from,
    subject: `登录 ${host}`,
    text: buildEmailText({
      url: normalizedUrl,
      host,
      expires: params.expires,
    }),
    html,
  });

  const rejected = result.rejected || [];
  const pending = result.pending || [];
  const failed = rejected.concat(pending).filter(Boolean);
  if (failed.length) {
    throw new Error(`Email (${failed.join(", ")}) could not be sent`);
  }
}
