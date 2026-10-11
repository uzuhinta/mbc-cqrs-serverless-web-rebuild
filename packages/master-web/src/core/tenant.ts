/**
 * Whether two tenant codes name the same tenant. The backend lowercases the
 * tenant it stores (core 1.1.0), while a host may configure it in any case.
 */
export const isSameTenant = (a: string | undefined, b: string | undefined) =>
  a !== undefined && b !== undefined && a.toLowerCase() === b.toLowerCase()
