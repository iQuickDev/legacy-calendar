import {
    registerDecorator,
    ValidationArguments,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface
} from 'class-validator';

const MAX_START_TIME_YEARS_AHEAD = 1;

function startOfDay(date: Date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
}

function endOfDay(date: Date) {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
}

function maxAllowedStartDate(referenceDate: Date) {
    const max = new Date(referenceDate);
    max.setFullYear(max.getFullYear() + MAX_START_TIME_YEARS_AHEAD);
    return endOfDay(max);
}

@ValidatorConstraint({ name: 'isEventStartTimeWithinAllowedRange', async: false })
export class IsEventStartTimeWithinAllowedRangeConstraint implements ValidatorConstraintInterface {
    validate(value: unknown): boolean {
        if (typeof value !== 'string') {
            return false;
        }

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return false;
        }

        const now = new Date();
        return parsed >= startOfDay(now) && parsed <= maxAllowedStartDate(now);
    }

    defaultMessage(args: ValidationArguments) {
        return `${args.property} must be today or within 1 year from now`;
    }
}

export function IsEventStartTimeWithinAllowedRange(validationOptions?: ValidationOptions) {
    return (object: object, propertyName: string) => {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: IsEventStartTimeWithinAllowedRangeConstraint
        });
    };
}
