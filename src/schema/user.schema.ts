import { object, string, number, InferType } from 'yup';

export const createUserSchema = object({
    body: object({
        email: string()
            .email('Must be a valid email address')
            .required('Email is required'),
        password: string()
            .required('Password is required')
            .min(6, 'Password must be at least 6 characters')
            .matches(/^[a-zA-Z0-9_.-]*$/, 'Password can only contain Latin letters'),
        balance: number()
            .required('You must create an account with a deposit amount')
            .positive('Balance must be a positive number ')
            .min(1)
    })
})

export interface CreateUserInput extends InferType<typeof createUserSchema> { }
