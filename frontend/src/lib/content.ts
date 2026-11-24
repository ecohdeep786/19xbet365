export interface ContentPage {
  slug: string;
  title: string;
  category: string;
  body: string;
  status: string;
  updated_at: string;
}

const updated = "2026-11-24T12:40:00.000Z";

export const CONTENT: Record<string, ContentPage> = {
  about: {
    slug: "about", title: "About 19xbet365", category: "Company", status: "published", updated_at: updated,
    body: "19xbet365 is an independent, virtual-credit entertainment platform built as a complete foundation for future licensed operations. Our sportsbook, casino lobby, live dealer lobby, and original instant games are presented with clear labels about what is active and what requires a licensed provider.\n\nEvery 19X Originals round is generated on our server and recorded. Real-money wagering, deposits, withdrawals, cash redemption, and financial commission systems are disabled.\n\nWe believe a gaming platform should be legible. That means showing the provider behind every title, writing bonus terms in plain language, keeping a public responsible-play toolkit, and making the audit trail a first-class product surface rather than a hidden compliance chore."
  },
  terms: {
    slug: "terms", title: "Terms and Conditions", category: "Legal", status: "published", updated_at: updated,
    body: "These terms govern use of the 19xbet365 demonstration platform. Access is limited to users aged 18 or older. All balances are virtual credits with no cash value and cannot be purchased, transferred, redeemed, or withdrawn.\n\nPlayable original games are provided for entertainment only. Third-party game pages are integration-ready interfaces and do not represent active provider services. 19xbet365 may suspend or close accounts that breach these terms or attempt to interfere with platform integrity.\n\nCompleted rounds and audit records are retained in an append-only ledger. Platform staff cannot alter settled game outcomes or erase audit history.\n\nYou are responsible for keeping your credentials secure and for all activity under your account. Do not attempt to probe, overload, reverse engineer, or manipulate the platform, its game engine, or its network hierarchy.\n\nThese terms are a demonstration document and are not a substitute for jurisdiction-specific legal advice. A licensed production deployment would require approved terms, responsible-gaming procedures, and regulatory disclosures."
  },
  privacy: {
    slug: "privacy", title: "Privacy Policy", category: "Legal", status: "published", updated_at: updated,
    body: "We collect account details, session metadata, gameplay activity, virtual-credit transactions, support communications, and security events to operate and protect the platform. We do not sell personal data. Data is retained according to the audit-retention policy and applicable law.\n\nYou can review and update your profile and security settings from your account. For data requests in this demonstration environment, contact support.\n\nSession cookies are HttpOnly and are used only to authenticate your account. Passwords are stored as scrypt hashes with per-account salts. Session tokens are stored as SHA-256 hashes. Audit records are append-only and hash-chained.\n\nThis foundation does not collect identity documents, payment details, or real-money transaction data. If those capabilities are added in a future licensed deployment, this policy must be updated before they are enabled."
  },
  "responsible-gaming": {
    slug: "responsible-gaming", title: "Responsible Gaming", category: "Safety", status: "published", updated_at: updated,
    body: "19xbet365 is entertainment, not income. Use virtual-credit limits, reality checks, cool-off periods, and self-exclusion to stay in control. Our account tools let you set a daily wager limit and short session reminders.\n\nIf you feel that play is affecting your wellbeing, take a break and seek independent support in your region. This platform does not offer real-money wagering.\n\nOur controls are designed to be easy to find: open Account → Responsible Gaming. Limits apply to virtual-credit stakes. Self-exclusion blocks playable actions for the period you choose and cannot be shortened by support staff.\n\n19xbet365 is for adults aged 18 or older. Never share your account with someone under 18. If you are concerned about gambling elsewhere, independent services such as BeGambleAware can provide confidential help."
  },
  "bonus-terms": {
    slug: "bonus-terms", title: "Bonus Terms", category: "Legal", status: "published", updated_at: updated,
    body: "All bonuses on 19xbet365 are virtual-credit gameplay allocations. They have no cash value, cannot be withdrawn, and do not create a debt or ownership interest. Tournament prize pools are virtual credits. One welcome allocation is available per verified player. Where a bonus has an expiry, the expiration is shown on the promotion card.\n\nPromotional credits may be used on playable 19X Originals and virtual sportsbook markets. They cannot be transferred between accounts, sold, or redeemed for cash or goods.\n\nAbuse of promotions, duplicate accounts, coordinated bonus harvesting, or attempts to manipulate game outcomes may result in account suspension and a review of linked accounts. All staff credit adjustments are recorded in the audit trail."
  },
  cookies: {
    slug: "cookies", title: "Cookie Policy", category: "Legal", status: "published", updated_at: updated,
    body: "19xbet365 uses a strictly necessary session cookie to authenticate your account. We do not use advertising cookies. The cookie is HttpOnly and SameSite-protected. Clearing it signs you out.\n\nThe platform may use browser storage for transient interface preferences such as an open bet slip. That data is not used as an authoritative database and does not contain your password or session token.\n\nIf we introduce analytics or personalisation cookies in a future deployment, this policy will be updated and consent will be requested where required."
  },
  aml: {
    slug: "aml", title: "AML & KYC Policy", category: "Legal", status: "published", updated_at: updated,
    body: "Real-money operations are disabled. In a future licensed deployment, identity verification, source-of-funds checks, sanctions screening, and transaction monitoring would be mandatory before any deposit, withdrawal, or real-money wager. No financial services are provided in this build.\n\nThis foundation does not accept payments, hold customer funds, or process withdrawals. Virtual credits are allocated by the platform for demonstration play and cannot be exchanged for value.\n\nSuspicious account behaviour, coordinated abuse, and attempts to circumvent controls are recorded and reviewed by authorized staff. Audit records are append-only and tamper-evident."
  },
  affiliates: {
    slug: "affiliates", title: "Affiliate Programme", category: "Company", status: "published", updated_at: updated,
    body: "19xbet365's affiliate programme is not open for real-money commissions. In this foundation build, referral links award virtual credits to both parties after a referred player completes their first round. Referring a player never grants administrative access or staff permissions.\n\nReferral relationships are stored as player-account links. They do not affect network visibility, credit controls, support scope, or the audit trail. Affiliate commissions, revenue share, and cash payouts are disabled.\n\nA future licensed deployment would require approved affiliate terms, marketing oversight, and jurisdiction-specific compliance before any commission model could be enabled."
  }
};

export function getStaticContent(slug: string) {
  return CONTENT[slug] || null;
}
