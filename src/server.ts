import dotenv from 'dotenv';
dotenv.config();
import app from './app';
import logger from './utils/logger'
const port = process.env.PORT || 80



app.listen(port, () => {
    logger.info(`App is running on port ${port}`);
})