import jwt from 'jsonwebtoken';
import { user } from '.prisma/client'
import logger from './logger';
import prisma from '../../client';

export const generateToken = async (instance: user): Promise<string> => {
    try {
        const token = jwt.sign({
            id: instance.id.toString()
        }, process.env.JWT_SECRET, {
            expiresIn: '7d'
        });

        const USER = await prisma.user.update({
            where: {
                id: instance.id
            },
            data: {
                tokens: {
                    push: token
                }
            }
        })

        return token

    } catch (error) {
        logger.error(error)
        throw new Error('Could not generate token');
    }
}