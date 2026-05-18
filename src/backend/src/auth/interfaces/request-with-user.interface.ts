import type { Request } from 'express';

export interface RequestWithUser extends Request {
    user: {
        userId?: number;
        id?: number;
        username: string;
        isAdmin: boolean;
    };
    impersonatorUserId?: number | null;
}
