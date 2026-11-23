import dns from "dns"

// Cheap checks that catch most fake / mistyped sign-up emails BEFORE a code is sent. They cannot prove an
// inbox exists (only the emailed code can); they stop typos like "name@gmil.com" and throw-away addresses.

const TYPOS = {
    "gmil.com": "gmail.com", "gmial.com": "gmail.com", "gamil.com": "gmail.com", "gmai.com": "gmail.com", "gmaill.com": "gmail.com",
    "gmail.co": "gmail.com", "gmail.con": "gmail.com", "gmail.cm": "gmail.com", "gnail.com": "gmail.com", "gmeil.com": "gmail.com", "gmail.in": "gmail.com",
    "yahooo.com": "yahoo.com", "yaho.com": "yahoo.com", "yahoo.con": "yahoo.com", "yhoo.com": "yahoo.com",
    "hotmial.com": "hotmail.com", "hotmail.con": "hotmail.com", "hotmal.com": "hotmail.com",
    "outlok.com": "outlook.com", "outlook.con": "outlook.com", "outllok.com": "outlook.com",
    "icloud.con": "icloud.com", "iclod.com": "icloud.com",
}

const DISPOSABLE = new Set([
    "mailinator.com", "guerrillamail.com", "guerrillamail.net", "10minutemail.com", "tempmail.com", "temp-mail.org", "yopmail.com",
    "trashmail.com", "sharklasers.com", "getnada.com", "dispostable.com", "maildrop.cc", "throwawaymail.com", "fakeinbox.com",
    "mailnesia.com", "tempail.com", "moakt.com", "mohmal.com", "emailondeck.com", "burnermail.io", "mintemail.com",
])

const domainOf = (email) => String(email).split("@").pop().toLowerCase()

const lookup = async (domain) => {
    if (process.env.EMAIL_MX_CHECK === "false") return "ok" // typo + disposable checks still run
    if (process.env.NODE_ENV === "test" && typeof globalThis.__MX_LOOKUP_MOCK__ === "function") return globalThis.__MX_LOOKUP_MOCK__(domain)
    const timeout = (p) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error("dns timeout"), { code: "ETIMEOUT" })), 3000))])
    try {
        const mx = await timeout(dns.promises.resolveMx(domain))
        if (mx?.length) return "ok"
    } catch (e) {
        if (!["ENOTFOUND", "ENODATA"].includes(e.code)) return "unknown" // DNS trouble on our side: do not block the person
    }
    try {
        const a = await timeout(dns.promises.resolve4(domain)) // a domain with no MX record can still accept mail on its address
        return a?.length ? "ok" : "none"
    } catch (e) {
        return ["ENOTFOUND", "ENODATA"].includes(e.code) ? "none" : "unknown"
    }
}

// -> null when fine, otherwise { message, suggestion? }
export const emailDomainProblem = async (email) => {
    const domain = domainOf(email)
    if (TYPOS[domain]) {
        const suggestion = email.slice(0, email.lastIndexOf("@") + 1) + TYPOS[domain]
        return { message: `Did you mean ${suggestion}? "${domain}" looks like a typing mistake.`, suggestion }
    }
    if (DISPOSABLE.has(domain)) return { message: "Temporary email addresses can't be used. Please use your real email." }
    if ((await lookup(domain)) === "none") return { message: `"${domain}" can't receive email. Please check the address.` }
    return null
}
