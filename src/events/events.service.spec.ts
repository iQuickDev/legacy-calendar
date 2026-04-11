import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventsService } from './events.service';

describe('EventsService.assignRide', () => {
    const eventsRepo = {
        findOne: jest.fn(),
        assignRide: jest.fn(),
    } as any;

    const notificationsService = {
        sendMulticast: jest.fn(),
    } as any;

    let service: EventsService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new EventsService(eventsRepo, notificationsService);
    });

    it('allows the host to assign a passenger to a driver in the event', async () => {
        eventsRepo.findOne.mockResolvedValue({
            id: 1,
            hostId: 10,
            participants: [
                { userId: 20, hasVehicle: false },
                { userId: 30, hasVehicle: true },
            ],
            rideAssignments: [],
        });
        eventsRepo.assignRide.mockResolvedValue({ ok: true });

        await expect(service.assignRide(1, 20, 30, 10)).resolves.toBeDefined();

        expect(eventsRepo.assignRide).toHaveBeenCalledWith(1, 20, 30);
    });

    it('allows a driver to remove a passenger from their own vehicle', async () => {
        eventsRepo.findOne.mockResolvedValue({
            id: 1,
            hostId: 10,
            participants: [
                { userId: 20, hasVehicle: false },
                { userId: 30, hasVehicle: true },
            ],
            rideAssignments: [
                { passengerId: 20, driverId: 30 },
            ],
        });
        eventsRepo.assignRide.mockResolvedValue({ ok: true });

        await expect(service.assignRide(1, 20, null, 30)).resolves.toBeDefined();

        expect(eventsRepo.assignRide).toHaveBeenCalledWith(1, 20, null);
    });

    it('rejects a non-host who is not the current driver', async () => {
        eventsRepo.findOne.mockResolvedValue({
            id: 1,
            hostId: 10,
            participants: [
                { userId: 20, hasVehicle: false },
                { userId: 30, hasVehicle: true },
            ],
            rideAssignments: [
                { passengerId: 20, driverId: 30 },
            ],
        });

        await expect(service.assignRide(1, 20, null, 40)).rejects.toBeInstanceOf(ForbiddenException);

        expect(eventsRepo.assignRide).not.toHaveBeenCalled();
    });

    it('throws when the passenger is not part of the event', async () => {
        eventsRepo.findOne.mockResolvedValue({
            id: 1,
            hostId: 10,
            participants: [],
            rideAssignments: [],
        });

        await expect(service.assignRide(1, 20, null, 10)).rejects.toBeInstanceOf(NotFoundException);

        expect(eventsRepo.assignRide).not.toHaveBeenCalled();
    });
});
