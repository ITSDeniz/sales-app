import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
    constructor(private readonly prisma: PrismaService) { }

    // Lists all items
    async findAll() {
        return this.prisma.product.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }

    // Brings single item with one ID
    async findOne(id: string) {
        const product = await this.prisma.product.findUnique({
            where: { id },
        });

        if (!product) {
            throw new NotFoundException(`Product with ID ${id} not found`);
        }

        return product;
    }
}