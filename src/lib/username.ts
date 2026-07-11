// تحويل اسم المستخدم إلى بريد داخلي فريد — لأن حقل email في قاعدة البيانات فريد وإلزامي
// مثال: "Moustapha" -> "moustapha@users.local"

export const USERNAME_EMAIL_SUFFIX = "@users.local";

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}${USERNAME_EMAIL_SUFFIX}`;
}

// القواعد: 3–20 حرفًا لاتينيًا أو أرقامًا أو _ . -
export const USERNAME_REGEX = /^[A-Za-z0-9_.-]{3,20}$/;
