import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
//import { replace } from 'lodash';
// const prisma = new PrismaClient();
import prisma from '../../client';

export const auth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let token = req.header("Authorization").replace("Bearer", "");
        token = token.trim();
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await prisma.user.findFirst({
            where: {
                id: +decoded.id,
                tokens: {
                    has: token.toString()
                }
            }
        });

        if (!user) {
            throw new Error("User not found")
        }

        //since this method has already found the user, there's no need for the route handler to start finding the user again.
        req.token = token;
        req.user = user;
        next();

    } catch (error: any) {
        console.error(error);
        if (error.message == 'jwt expired') {
            // @ts-ignore
            const decodedExp = jwt.decode(token, {
                complete: true
            });
            const id = +decodedExp?.payload.id;
            const user = await prisma.user.findFirst({
                where: {
                    id: id
                }
            })

            if (!user) {
                return res.status(403).send({
                    message: 'Please authenticate',
                    error: error.message
                })
            }

            const filteredTokens = user.tokens.filter(singleToken => {
                return singleToken != token;
            })

            await prisma.user.update({
                where: {
                    id: id
                },
                data: {
                    tokens: filteredTokens
                }
            })

            return res.status(401).send({
                message: "expired"
            })
        }

        return res.status(403).send({
            message: "You are not authorized",
            error: error.message
        })
    }
}
