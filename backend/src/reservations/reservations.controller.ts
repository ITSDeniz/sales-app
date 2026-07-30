import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from '../dto/create-reservation.dto';

@Controller('reservations')
export class ReservationsController {
    constructor(private readonly reservationsService: ReservationsService) { }

    @Post()
    async create(@Body() createReservationDto: CreateReservationDto) {
        return this.reservationsService.create(createReservationDto);
    }

    // PATCH /reservations/:id/complete
    @Patch(':id/complete')
    async complete(@Param('id') id: string) {
        return this.reservationsService.complete(id);
    }

    // PATCH /reservations/:id/cancel
    @Patch(':id/cancel')
    async cancel(@Param('id') id: string) {
        return this.reservationsService.cancel(id);
    }
}