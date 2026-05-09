export interface AuthLoginDto {
    username: string;
    password: string;
}

export interface ChangePasswordDto {
    currentPassword: string;
    newPassword: string;
}
