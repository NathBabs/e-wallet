import { Response } from 'express';
import logger from '../utils/logger';
import { AppError, StatusCode } from './AppError';

class ErrorHandler {
  private isTrustedError(error: Error): boolean {
    if (error instanceof AppError) {
      return error.isOperational;
    }

    return false;
  }

  public handleError(error: Error | AppError, response?: Response): void {
    if (this.isTrustedError(error) && response) {
      this.handleTrustedError(error as AppError, response);
    } else {
      this.handleCriticalError(error, response);
    }
  }

  private handleTrustedError(error: AppError, response: Response): void {
    response.status(error.statusCode).json({ message: error.message });
  }

  private handleCriticalError(
    error: Error | AppError,
    response?: Response
  ): void {
    if (response) {
      response
        .status(StatusCode.INTERNAL_SERVER_ERROR)
        .json({ message: 'Internal server error' });
    }

    logger.error('Application encountered a critical error. Exiting');
    process.exit(1);
  }
}

export const errorHandler = new ErrorHandler();
