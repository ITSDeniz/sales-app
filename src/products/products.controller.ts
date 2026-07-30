import { Controller, Get, Param } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    // GET /products
    @Get()
    async findAll() {
        return this.productsService.findAll();
    }

    // GET /products/:id
    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.productsService.findOne(id);
    }
}