export enum StatusCode {
  FORBIDDEN = 403,
  OK = 200,
  CREATED = 201,
  UN_AUTHORISED = 401,
  ACCEPTED = 202,
  BAD_REQUEST = 400,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UN_AVAILABLE_FOR_LEGAL_REASONS = 451,
  UN_AVAILABLE = 503,
  NOT_ACCEPTABLE = 406,
  RE_DIRECT = 302,
  INTERNAL_SERVER_ERROR = 500,
}

interface AppErrorArgs {
  name?: string;
  statusCode: StatusCode;
  description: string;
  isOperational?: boolean;
}

export class AppError extends Error {
  public readonly name: string;
  public readonly statusCode: StatusCode;
  public readonly isOperational: boolean = true;

  constructor(args: AppErrorArgs) {
    super(args.description);

    Object.setPrototypeOf(this, new.target.prototype);

    this.name = args.name || 'Error';
    this.statusCode = args.statusCode;

    if (args.isOperational !== undefined) {
      this.isOperational = args.isOperational;
    }

    Error.captureStackTrace(this);
  }
}
