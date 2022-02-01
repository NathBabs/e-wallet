import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import morgan from 'morgan';
import routes from './routes'

const app = express();

app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: false }));

app.use('/', routes);


export default app;