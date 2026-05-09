import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, Max, Min } from 'class-validator';

export class ParticipateDto {
    @ApiProperty({ type: Boolean, example: true, description: 'Whether the user wants food', required: false })
    @IsOptional()
    @IsBoolean()
    wantsFood?: boolean;

    @ApiProperty({ type: Boolean, example: true, description: 'Whether the user wants weed', required: false })
    @IsOptional()
    @IsBoolean()
    wantsWeed?: boolean;

    @ApiProperty({ type: Boolean, example: true, description: 'Whether the user wants sleep', required: false })
    @IsOptional()
    @IsBoolean()
    wantsSleep?: boolean;

    @ApiProperty({ type: Boolean, example: true, description: 'Whether the user wants alcohol', required: false })
    @IsOptional()
    @IsBoolean()
    wantsAlcohol?: boolean;

    @ApiProperty({ type: Boolean, example: true, description: 'Whether the user wants beer', required: false })
    @IsOptional()
    @IsBoolean()
    wantsBeer?: boolean;

    @ApiProperty({ type: Boolean, example: true, description: 'Whether the user has a vehicle', required: false })
    @IsOptional()
    @IsBoolean()
    hasVehicle?: boolean;

    @ApiProperty({ type: Number, example: 4, description: 'Number of total seats', required: false })
    @IsOptional()
    @Min(1)
    @Max(9)
    vehicleSeats?: number;
}
