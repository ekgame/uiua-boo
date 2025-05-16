export namespace ScopeMemberRole {
  export const OWNER = 'OWNER';
  export const ADMIN = 'ADMIN';
  export const USER = 'USER';

  export const ALL = [OWNER, ADMIN, USER] as const;
}

export type ScopeMemberRole = typeof ScopeMemberRole.ALL[number];