import { IsNotEmpty, IsNumber, IsString, IsUUID, Min } from 'class-validator';

export class CreateReservationDto {
    @IsString()
    @IsUUID()
    @IsNotEmpty()
    productId: string;

    @IsNumber()
    @Min(1)
    quantity: number;
}