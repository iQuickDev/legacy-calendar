import { PrismaClient } from '../prisma/generated/client.js';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    console.log('Current users:', users.map(u => ({ id: u.id, username: u.username, isAdmin: u.isAdmin })));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
