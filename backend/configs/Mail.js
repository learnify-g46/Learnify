import nodemailer from "nodemailer"
import dotenv from "dotenv"
dotenv.config()

// Sends the one-time codes (email verification and forgot password).
//  - Brevo (recommended, free plan = 300 emails/day): set BREVO_API_KEY and MAIL_FROM_EMAIL in .env.
//    It uses Brevo's HTTPS API, so it also works on hosts that block SMTP ports.
//  - Otherwise it falls back to the old Gmail SMTP login (EMAIL / EMAIL_PASS).

const TEXTS = {
  reset: { subject: "Reset your Learnify password", intro: "Your Learnify password reset code is", minutes: 5 },
  verify: { subject: "Verify your Learnify email", intro: "Your Learnify email verification code is", minutes: 10 },
}

const htmlFor = (t, otp) => `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111">
  <p>${t.intro}</p>
  <p style="font-size:28px;letter-spacing:6px;font-weight:bold;margin:12px 0">${otp}</p>
  <p>It expires in ${t.minutes} minutes. If you did not ask for this, you can ignore this email.</p>
</div>`

let gmail = null
const gmailTransport = () => (gmail ||= nodemailer.createTransport({
  service: "Gmail", port: 465, secure: true,
  auth: { user: process.env.EMAIL, pass: process.env.EMAIL_PASS },
}))

const sendWithBrevo = async (to, t, otp) => {
  const url = (process.env.NODE_ENV === "test" && process.env.BREVO_API_URL) || "https://api.brevo.com/v3/smtp/email"
  const from = process.env.MAIL_FROM_EMAIL || process.env.EMAIL
  if (!from) throw Object.assign(new Error("MAIL_FROM_EMAIL is not set"), { code: "MAIL_CONFIG" })
  let response
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "api-key": process.env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { name: process.env.MAIL_FROM_NAME || "Learnify", email: from },
        to: [{ email: to }],
        subject: t.subject,
        htmlContent: htmlFor(t, otp),
      }),
      signal: AbortSignal.timeout(15000),
    })
  } catch (e) {
    throw Object.assign(new Error("Brevo unreachable"), { code: "MAIL_NETWORK" })
  }
  if (!response.ok) {
    // the key itself is never logged; the status tells what is wrong (401 = wrong key, 400 = sender not verified in Brevo)
    throw Object.assign(new Error(`Brevo refused the email (HTTP ${response.status})`), { code: `BREVO_${response.status}` })
  }
}

// purpose: "reset" (forgot password) or "verify" (new account / first login)
const sendMail = async (to, otp, purpose = "reset") => {
  // automated tests read the code here instead of sending a real email
  if (process.env.NODE_ENV === "test" && typeof globalThis.__MAIL_MOCK__ === "function") {
    return globalThis.__MAIL_MOCK__({ to, otp, purpose })
  }
  const t = TEXTS[purpose] || TEXTS.reset
  if (process.env.BREVO_API_KEY) return sendWithBrevo(to, t, otp)
  return gmailTransport().sendMail({ from: process.env.EMAIL, to, subject: t.subject, html: htmlFor(t, otp) })
}

export default sendMail
