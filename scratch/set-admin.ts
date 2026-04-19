import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    if (users.length > 0) {
        const adminUser = users[0];
        await prisma.user.update({
            where: { id: adminUser.id },
            data: { isAdmin: true }
        });
        console.log(`User ${adminUser.username} is now an admin.`);
    } else {
        console.log('No users found.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
