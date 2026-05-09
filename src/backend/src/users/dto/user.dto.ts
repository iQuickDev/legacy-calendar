import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
    @ApiProperty({ type: Number, example: 1, description: 'The user ID' })
    id!: number;

    @ApiProperty({ type: String, example: 'user123', description: 'The username' })
    username!: string;

    @ApiProperty({
        type: String,
        example: '/uploads/profile-pictures/1.webp',
        description: 'Profile picture URL',
        required: false,
        nullable: true
    })
    profilePicture?: string | null;

    @ApiProperty({ type: Boolean, example: false, description: 'Whether the user is an admin' })
    isAdmin!: boolean;
}
