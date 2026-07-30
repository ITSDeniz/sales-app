import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from '../dto/create-reservation.dto';

describe('ReservationsController', () => {
  let controller: ReservationsController;
  let service: ReservationsService;

  const mockReservation = {
    id: 'reservation-1',
    productId: 'product-1',
    quantity: 1,
    status: 'PENDING',
    expiresAt: new Date(),
    createdAt: new Date(),
  };

  const mockReservationsService = {
    create: jest.fn().mockResolvedValue(mockReservation),
    complete: jest.fn().mockResolvedValue({ ...mockReservation, status: 'COMPLETED' }),
    cancel: jest.fn().mockResolvedValue({ ...mockReservation, status: 'EXPIRED' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationsController],
      providers: [
        {
          provide: ReservationsService,
          useValue: mockReservationsService,
        },
      ],
    }).compile();

    controller = module.get<ReservationsController>(ReservationsController);
    service = module.get<ReservationsService>(ReservationsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a reservation', async () => {
      const dto: CreateReservationDto = { productId: 'product-1', quantity: 1 };
      const result = await controller.create(dto);
      expect(result).toEqual(mockReservation);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('complete', () => {
    it('should complete a reservation', async () => {
      const result = await controller.complete('reservation-1');
      expect(result.status).toEqual('COMPLETED');
      expect(service.complete).toHaveBeenCalledWith('reservation-1');
    });
  });

  describe('cancel', () => {
    it('should cancel a reservation', async () => {
      const result = await controller.cancel('reservation-1');
      expect(result.status).toEqual('EXPIRED');
      expect(service.cancel).toHaveBeenCalledWith('reservation-1');
    });
  });
});
