export type UserRole = 'super_admin' | 'admin' | 'member';
export interface JwtPayload {
    sub: string;
    email: string;
    role: UserRole;
    iat?: number;
    exp?: number;
}
export interface AuthenticatedUser {
    id: string;
    email: string;
    role: UserRole;
}
