export interface LocalAccount {
  username: string;
  password: string;
  employeeCode: string;
}

export const LOCAL_ACCOUNTS: LocalAccount[] = [
  { username: 'admin', password: 'admin123', employeeCode: 'ADM-001' },
  { username: 'alpin', password: '021', employeeCode: '021' },
  { username: 'ricky', password: '022', employeeCode: '022' },
  { username: 'johari', password: '023', employeeCode: '023' },
  { username: 'agam', password: '024', employeeCode: '024' },
  { username: 'nofiatul', password: '025', employeeCode: '025' },
];

const STORAGE_KEY_PASSWORDS = 'safemax_passwords_v1';

function getPasswordOverrides(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_PASSWORDS) || '{}');
  } catch {
    return {};
  }
}

export function findLocalAccount(identifier: string): LocalAccount | undefined {
  const normalizedIdentifier = identifier.trim().toLowerCase();

  const account = LOCAL_ACCOUNTS.find(
    (account) =>
      account.username === normalizedIdentifier ||
      account.employeeCode.toLowerCase() === normalizedIdentifier
  );

  if (!account) return undefined;
  return { ...account, password: getPasswordOverrides()[account.employeeCode] || account.password };
}

export function updateLocalPassword(employeeCode: string, password: string): void {
  if (typeof window === 'undefined') return;
  const passwords = getPasswordOverrides();
  passwords[employeeCode] = password;
  localStorage.setItem(STORAGE_KEY_PASSWORDS, JSON.stringify(passwords));
}