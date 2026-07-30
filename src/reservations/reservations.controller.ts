import { Controller, Post, Body } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from '../dto/create-reservation.dto';

@Controller('reservations')
export class ReservationsController {
    constructor(private readonly reservationsService: ReservationsService) { }

    @Post()
    async create(@Body() createReservationDto: CreateReservationDto) {
        return this.reservationsService.create(createReservationDto);
    }
}