import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { ReservationStatus } from '@prisma/client';

@Injectable()
export class ReservationsService {
    private readonly logger = new Logger(ReservationsService.name);

    constructor(private readonly prisma: PrismaService) { }

    async create(createReservationDto: CreateReservationDto) {
        const { productId, quantity } = createReservationDto;

        // Use Prisma Transaction to guarantee stock deduction and reservation creation
        return this.prisma.$transaction(async (tx) => {
            // 1. Find and check the product
            const product = await tx.product.findUnique({
                where: { id: productId },
            });

            if (!product) {
                throw new NotFoundException(`Product with ID ${productId} not found`);
            }

            if (product.availableStock < quantity) {
                throw new BadRequestException('Not enough stock available');
            }

            // 2. Deduct the stock
            await tx.product.update({
                where: { id: productId },
                data: {
                    availableStock: product.availableStock - quantity,
                },
            });

            // 3. Set a 5-minute expiration date (+5 minutes)
            // const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

            // 3. Set a 15-second expiration date for testing (+15 seconds)
            const expiresAt = new Date(Date.now() + 15 * 1000);

            // 4. Create the reservation
            const reservation = await tx.reservation.create({
                data: {
                    productId,
                    quantity,
                    expiresAt,
                    status: ReservationStatus.PENDING,
                },
            });

            return reservation;
        });
    }

    // 1. Complete Payment (Finalize the Sale)
    async complete(id: string) {
        const reservation = await this.prisma.reservation.findUnique({
            where: { id },
        });

        if (!reservation) {
            throw new NotFoundException(`Reservation with ID ${id} not found`);
        }

        if (reservation.status !== ReservationStatus.PENDING) {
            throw new BadRequestException(
                `Reservation is already ${reservation.status.toLowerCase()}`,
            );
        }

        // Set status to COMPLETED (Stock was already deducted during creation)
        return this.prisma.reservation.update({
            where: { id },
            data: { status: ReservationStatus.COMPLETED },
        });
    }

    // 2. User Cancels Reservation (Immediate Stock Refund)
    async cancel(id: string) {
        const reservation = await this.prisma.reservation.findUnique({
            where: { id },
        });

        if (!reservation) {
            throw new NotFoundException(`Reservation with ID ${id} not found`);
        }

        if (reservation.status !== ReservationStatus.PENDING) {
            throw new BadRequestException(
                `Cannot cancel reservation with status ${reservation.status}`,
            );
        }

        // Revert stock and update status to EXPIRED immediately using a transaction
        return this.prisma.$transaction(async (tx) => {
            await tx.product.update({
                where: { id: reservation.productId },
                data: {
                    availableStock: {
                        increment: reservation.quantity,
                    },
                },
            });

            return tx.reservation.update({
                where: { id },
                data: { status: ReservationStatus.EXPIRED },
            });
        });
    }


    // Cron job that runs every 10 seconds
    @Cron('*/10 * * * * *')
    async handleExpiredReservations() {
        const now = new Date();

        // 1. Find reservations that are expired but still PENDING
        const expiredReservations = await this.prisma.reservation.findMany({
            where: {
                status: ReservationStatus.PENDING,
                expiresAt: {
                    lte: now, // expiresAt <= current time
                },
            },
        });

        if (expiredReservations.length === 0) {
            return;
        }

        this.logger.log(`Found ${expiredReservations.length} expired reservations. Reverting stock...`);

        // 2. For each expired reservation, revert the stock and change the status to EXPIRED
        for (const reservation of expiredReservations) {
            await this.prisma.$transaction(async (tx) => {
                // Revert the stock
                await tx.product.update({
                    where: { id: reservation.productId },
                    data: {
                        availableStock: {
                            increment: reservation.quantity, // Increment stock back
                        },
                    },
                });

                // Update the reservation status to EXPIRED
                await tx.reservation.update({
                    where: { id: reservation.id },
                    data: {
                        status: ReservationStatus.EXPIRED,
                    },
                });
            });
        }

        this.logger.log(`Successfully processed expired reservations.`);
    }
}