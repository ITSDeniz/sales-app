import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsService } from './reservations.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ReservationStatus } from '@prisma/client';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let prisma: PrismaService;

  const mockProduct = {
    id: 'product-1',
    name: 'Wireless Headphones',
    price: 99.99,
    availableStock: 10,
    createdAt: new Date(),
  };

  const mockReservation = {
    id: 'reservation-1',
    productId: 'product-1',
    quantity: 2,
    status: ReservationStatus.PENDING,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    createdAt: new Date(),
  };

  const mockTx = {
    product: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    reservation: {
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockPrismaService = {
    $transaction: jest.fn().mockImplementation((cb) => cb(mockTx)),
    reservation: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    product: {
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully reserve stock if available', async () => {
      mockTx.product.findUnique.mockResolvedValue(mockProduct);
      mockTx.product.update.mockResolvedValue({
        ...mockProduct,
        availableStock: mockProduct.availableStock - 2,
      });
      mockTx.reservation.create.mockResolvedValue(mockReservation);

      const result = await service.create({
        productId: 'product-1',
        quantity: 2,
      });

      expect(result).toEqual(mockReservation);
      expect(mockTx.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'product-1' },
      });
      expect(mockTx.product.update).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        data: { availableStock: 8 },
      });
      expect(mockTx.reservation.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if product is not found', async () => {
      mockTx.product.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ productId: 'invalid-id', quantity: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if stock is insufficient', async () => {
      mockTx.product.findUnique.mockResolvedValue({
        ...mockProduct,
        availableStock: 1,
      });

      await expect(
        service.create({ productId: 'product-1', quantity: 2 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('complete', () => {
    it('should complete reservation and finalize sale', async () => {
      mockPrismaService.reservation.findUnique.mockResolvedValue(mockReservation);
      mockPrismaService.reservation.update.mockResolvedValue({
        ...mockReservation,
        status: ReservationStatus.COMPLETED,
      });

      const result = await service.complete('reservation-1');

      expect(result.status).toBe(ReservationStatus.COMPLETED);
      expect(prisma.reservation.findUnique).toHaveBeenCalledWith({
        where: { id: 'reservation-1' },
      });
      expect(prisma.reservation.update).toHaveBeenCalledWith({
        where: { id: 'reservation-1' },
        data: { status: ReservationStatus.COMPLETED },
      });
    });

    it('should throw NotFoundException if reservation is not found', async () => {
      mockPrismaService.reservation.findUnique.mockResolvedValue(null);

      await expect(service.complete('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if reservation is not pending', async () => {
      mockPrismaService.reservation.findUnique.mockResolvedValue({
        ...mockReservation,
        status: ReservationStatus.COMPLETED,
      });

      await expect(service.complete('reservation-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancel', () => {
    it('should cancel reservation and return stock to product', async () => {
      mockPrismaService.reservation.findUnique.mockResolvedValue(mockReservation);

      // Re-mocking $transaction for the cancel method transaction block
      mockPrismaService.$transaction.mockImplementationOnce(async (cb) => {
        const txMock = {
          product: {
            update: jest.fn().mockResolvedValue(mockProduct),
          },
          reservation: {
            update: jest.fn().mockResolvedValue({
              ...mockReservation,
              status: ReservationStatus.EXPIRED,
            }),
          },
        };
        return cb(txMock);
      });

      const result = await service.cancel('reservation-1');

      expect(result.status).toBe(ReservationStatus.EXPIRED);
      expect(prisma.reservation.findUnique).toHaveBeenCalledWith({
        where: { id: 'reservation-1' },
      });
    });

    it('should throw NotFoundException if reservation is not found', async () => {
      mockPrismaService.reservation.findUnique.mockResolvedValue(null);

      await expect(service.cancel('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if reservation is already cancelled or completed', async () => {
      mockPrismaService.reservation.findUnique.mockResolvedValue({
        ...mockReservation,
        status: ReservationStatus.EXPIRED,
      });

      await expect(service.cancel('reservation-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
