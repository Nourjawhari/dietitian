import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// npx prisma db seed

const prisma = new PrismaClient({
    adapter: new PrismaPg({connectionString: process.env.DATABASE_URL})
})

async function main() {
    await prisma.user.deleteMany();
    // await prisma.user.create({
    //     data: {
    //         id: "",
    //         username: "super_admin",
    //         email: 
    //     }
    // })
}

main().then(async () => {
    console.log("Seeding completed successfully")
}).catch(async (e) => {
    console.error(e);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
})