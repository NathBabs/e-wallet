import jwt from 'jsonwebtoken';
import moment from 'moment';
import {PrismaClient, Prisma} from '@prisma/client';
import {nanoid} from 'nanoid';

const prisma = new PrismaClient();

import {prismaMock} from '../../singleton';

let users: { email: string; password: string; account: { create: { balance: number; }; }; };//: Prisma.userCreateInput[]
let transactions: { id: number; amount: number; receiverId: number; senderId: number; txRef: string; }[];//


export let userOne: typeof users = {
    email: 'nath@gmail.com',
    password: 'nathaniel',
    account: {
        create: {
            balance: 100000.00
        }
    }
}
export let userTwo: typeof users = {
    email: 'nathaniel@gmail.com',
    password: 'nathaniel',
    account: {
        create: {
            balance: 100000.00
        }
    }
}

// transactions =[
//     {
//         id: 1,
//         amount: 2000,
//         receiverId: userTwoCreate.id,
//         senderId: userOneCreate.id,
//         txRef: nanoid(12)
//     },
//     {
//         id: 2,
//         amount: 5000,
//         receiverId: userOneCreate.id,
//         senderId: userTwoCreate.id,
//         txRef: nanoid(12)
//     }
// ]

export const setupDatabase = async () => {
    const txDelete = await prisma.transactions.deleteMany();
    const accDelete = await prisma.account.deleteMany();
    const userDelete = await prisma.user.deleteMany();

    //await prisma.$transaction([txDelete, accDelete, userDelete]);
    const userOneCreate = await prisma.user.create({
        data: userOne
    });
    const userTwoCreate = await prisma.user.create({
        data: userTwo
    });



    // const res = await prisma.$transaction([userOneCreate, userTwoCreate])

    //const txCreate =
    // prisma.transactions.createMany({
    //     data: [
    //         {
    //             id: 1,
    //             amount: 2000,
    //             receiverId: userTwoCreate.id,
    //             senderId: userOneCreate.id,
    //             txRef: nanoid(12)
    //         },
    //         {
    //             id: 2,
    //             amount: 5000,
    //             receiverId: userOneCreate.id,
    //             senderId: userTwoCreate.id,
    //             txRef: nanoid(12)
    //         }
    //     ]
    // })

}