export namespace UserRole {
  export const ADMIN = 'ADMIN';
  export const USER = 'USER';

  export const ALL = [ADMIN, USER] as const;
}

export type UserRole = typeof UserRole.ALL[number];