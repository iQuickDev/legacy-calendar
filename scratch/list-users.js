const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    console.log('Current users:', users.map(u => ({ id: u.id, username: u.username })));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
