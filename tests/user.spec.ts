import request from 'supertest';
import app from '../src/app';
import { PrismaClient, Prisma } from '@prisma/client';
import { createSandbox } from 'sinon';
import logger from '../src/utils/logger';

const prisma = new PrismaClient();
const sandbox = createSandbox();
/* import {
    userOne,
    userTwo,
    setupDatabase
} from './fixtures/db'; */

describe('User Authentication', () => {
    let users: { email: string; password: string; account: { create: { balance: number; }; }; };//: Prisma.userCreateInput[]
    let transactions: { id: number; amount: number; receiverId: number; senderId: number; txRef: string; }[];//
    let userOne: typeof users;
    let userTwo: typeof users;


    beforeAll(async () => {
        userOne = {
            email: 'nath@gmail.com',
            password: 'nathaniel',
            account: {
                create: {
                    balance: 100000.00
                }
            }
        }


        const userOneCreate = await prisma.user.create({
            data: userOne
        });
        logger.info(`created a user`);
    });

    afterAll(async () => {
        const tablenames =
            await prisma.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname='public'`

        for (const { tablename } of tablenames) {
            if (tablename !== '_prisma_migrations') {
                try {
                    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`)
                } catch (error) {
                    logger.error({ error });
                }
            }
        }
        //sandbox.restore();
        await prisma.$disconnect()
    })


    test('should sign up a new user', async () => {
        const response = await request(app)
            .post('/wallet/register')
            .send({
                email: 'oku@gmail.com',
                password: 'password',
                balance: 50000
            })
            .expect(201);

        expect(response.body.success).toBe(true);
    });

    test('should not login non existent user', async () => {
        const response = await request(app)
            .post('/wallet/login')
            .send({
                email: 'oshuka@gmail.com',
                password: 'ozumbadadiwe'
            })
            .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Wrong username or password")
    })

    test('should fail when password is not correct', async () => {
        const response = await request(app)
            .post('/wallet/login')
            .send({
                email: userOne.email,
                password: '234ert5'
            })
            .expect(404);

        expect(response.text).toBe('Username or Password does not exist')
    })
});