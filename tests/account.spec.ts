import request from 'supertest';
import app from '../src/app';
import { createSandbox } from 'sinon';
import { PrismaClient, Prisma } from '@prisma/client';
import { generateToken } from '../src/utils/generateAuthToken';

const prisma = new PrismaClient();

import { nanoid } from 'nanoid';
import logger from '../src/utils/logger';
//================================================================================================
let users: {
  email: string;
  password: string;
  account: { create: { balance: number } };
}; //: Prisma.userCreateInput[]
let transactions: {
  id: number;
  amount: number;
  receiverId: number;
  senderId: number;
  txRef: string;
}[]; //
let userOne: typeof users;
let userTwo: typeof users;
let token: any;
let userOneCreate: any;
let userTwoCreate: any;
let tx;
let amount = 5000;

//before

beforeAll(async () => {
  jest.resetModules();
  userOne = {
    email: 'babs@gmail.com',
    password: 'nathaniel',
    account: {
      create: {
        balance: 100000.0,
      },
    },
  };
  userTwo = {
    email: 'babalola@gmail.com',
    password: 'nathaniel',
    account: {
      create: {
        balance: 100000.0,
      },
    },
  };

  userOneCreate = await prisma.user.create({
    data: userOne,
    include: {
      account: true,
    },
  });
  logger.info('user 1 created successfully');
  userTwoCreate = await prisma.user.create({
    data: userTwo,
    include: {
      account: true,
    },
  });

  logger.info('user 2 created successfully');
  token = await generateToken(userOneCreate);

  await prisma.transactions.createMany({
    data: [
      {
        amount: 2000,
        receiverId: userTwoCreate.account.accNumber,
        senderId: userOneCreate.account.accNumber,
        txRef: nanoid(12),
      },
      {
        amount: 5000,
        receiverId: userOneCreate.account.accNumber,
        senderId: userTwoCreate.account.accNumber,
        txRef: nanoid(12),
      },
    ],
  });
});

afterAll(async () => {
  const tablenames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

  for (const { tablename } of tablenames) {
    if (tablename !== '_prisma_migrations') {
      try {
        await prisma.$executeRawUnsafe(
          `TRUNCATE TABLE "public"."${tablename}" CASCADE;`
        );
      } catch (error) {
        logger.error({ error });
      }
    }
  }
  //sandbox.restore();
  await prisma.$disconnect();
});

describe('Account API', () => {
  test('should transfer money to another user', async () => {
    const response = await request(app)
      .post('/wallet/transfer')
      .set('Authorization', `Bearer ${token}`)
      .send({
        to: userTwoCreate.account.accNumber,
        amount: 5000,
      })
      .expect(200);
    expect(response.body).toHaveProperty('data.transactionReference');
  });

  test('should not transfer when amount is greater than balance', async () => {
    const response = await request(app)
      .post('/wallet/transfer')
      .set('Authorization', `Bearer ${token}`)
      .send({
        to: userTwoCreate.account.accNumber,
        amount: 5000000,
      })
      .expect(400);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe(
      `This A/C number: ${userOneCreate.account.accNumber} does not have sufficient funds`
    );
  });

  test('should initiate a refund', async () => {
    const transaction = await prisma.transactions.findFirst({
      where: {
        receiverId: userOneCreate.account.accNumber,
      },
    });
    const response = await request(app)
      .post('/wallet/refund')
      .set('Authorization', `Bearer ${token}`)
      .send({
        txRef: transaction?.txRef,
      });

    expect(response.status).toEqual(200);
    expect(response.body.status).toBe(true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('message');
    expect(response.body.data).toHaveProperty('transactionReference');
  });

  test('should deposit money into account', async () => {
    const response = await request(app)
      .post(`/wallet/deposit?amount=${amount}`)
      .set('Authorization', `Bearer ${token}`)
      .send()
      .expect(200);

    expect(response.body.status).toBe(true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('message');
    expect(response.body.data).toHaveProperty('balance');
    expect(typeof response.body.data.balance).toBe('number');
  });

  test('should withdraw an amount', async () => {
    const response = await request(app)
      .post(`/wallet/withdraw?amount=1000`)
      .set('Authorization', `Bearer ${token}`)
      .send()
      .expect(200);

    expect(response.body.status).toBe(true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('balance');
    expect(typeof response.body.data.balance).toBe('number');
    expect(response.body.data.balance).toBe(94000);
  });

  test('should get account balance', async () => {
    const response = await request(app)
      .get('/wallet/balance')
      .set('Authorization', `Bearer ${token}`)
      .send()
      .expect(200);

    expect(response.body.status).toBe(true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('balance');
    expect(typeof response.body.data.balance).toBe('number');
  });

  test('Should get transaction history', async () => {
    const response = await request(app)
      .get('/wallet/history')
      .set('Authorization', `Bearer ${token}`)
      .send()
      .expect(200);

    expect(response.body.status).toBe(true);
    expect(response.body.data).toHaveProperty('list');
    expect(Array.isArray(response.body.data.list)).toBe(true);
    expect(response.body.data.list[0]).toHaveProperty('from');
    expect(response.body.data.list[0]).toHaveProperty('to');
    expect(response.body.data.list[0]).toHaveProperty('amount');
    expect(response.body.data.list[0]).toHaveProperty('transactionReference');
    expect(response.body.data.list[0]).toHaveProperty('date');
  });
});
