import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  // Clean existing products (optional, but good for clean state)
  await prisma.reservation.deleteMany();
  await prisma.product.deleteMany();

  const products = [
    {
      name: 'Wireless Headphones',
      price: 99.99,
      availableStock: 50,
    },
    {
      name: 'Smart Watch',
      price: 199.99,
      availableStock: 30,
    },
    {
      name: 'Mechanical Keyboard',
      price: 129.99,
      availableStock: 15,
    },
    {
      name: 'Gaming Mouse',
      price: 59.99,
      availableStock: 40,
    },
    {
      name: 'USB-C Hub',
      price: 39.99,
      availableStock: 100,
    },
  ];

  for (const product of products) {
    const createdProduct = await prisma.product.create({
      data: product,
    });
    console.log(`Created product with id: ${createdProduct.id} (${createdProduct.name})`);
  }

  console.log('Seeding completed!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
