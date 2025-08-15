// lib/emailTemplates/baseEmailTemplate.js
export function baseEmailTemplate({
  title,
  message,
  // NEW: configurable header bg + logo URL + CTA (optional)
  headerBg = "#2b2d42",
  logoUrl = process.env.NEXT_PUBLIC_EMAIL_LOGO_URL ||
    "https://res.cloudinary.com/matscout/image/upload/v1752188084/matScout_email_logo_rx30tk.png",
  ctaUrl = "https://matscout.com",
  ctaText = "Login to MatScout",
}) {
  return `
    <div style="background-color:#f3f4f6;padding:40px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,'Noto Sans',sans-serif;color:#111827;">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <div style="background-color:${headerBg};padding:20px;text-align:center;">
          <img src="${logoUrl}" alt="MatScout" style="max-height:60px;display:block;margin:0 auto;width:auto;height:auto;" />
        </div>
        <div style="padding:30px;">
          <h2 style="margin:0 0 20px 0;font-size:20px;color:#111827;">${title}</h2>
          ${message}
          <div style="margin-top:30px;text-align:center;">
            <a href="${ctaUrl}" style="display:inline-block;padding:10px 20px;background-color:#dc2626;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">
              ${ctaText}
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}
