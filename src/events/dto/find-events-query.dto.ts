import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty } from 'class-validator';

export class FindEventsQueryDto {
    @ApiProperty({
        example: '2026-04-01T00:00:00.000Z',
        description: 'Start of the visible calendar range, inclusive'
    })
    @IsNotEmpty()
    @Type(() => Date)
    @IsDate()
    start: Date;

    @ApiProperty({
        example: '2026-05-03T23:59:59.999Z',
        description: 'End of the visible calendar range, inclusive'
    })
    @IsNotEmpty()
    @Type(() => Date)
    @IsDate()
    end: Date;
}
