import { createWriteStream, WriteStream } from "fs";

import Logger, { ILogErrorEvent, ILogEvent } from ".";

type MessageFormatter = (event: ILogEvent) => string;
type ErrorFormatter = (event: ILogErrorEvent) => string;

interface IFormatter {
  message: MessageFormatter;
  error: ErrorFormatter;
}

export abstract class BaseHandler {
  constructor(private logger: Logger, level: number) {
    logger.on("message", event => {
      if (level <= event.level) this.handleMessage(event);
    });
    logger.on("error", event => {
      if (level <= event.level) {
        if (event.err) this.handleError(event);
      }
    });
  }

  public abstract handleMessage(event: ILogEvent): void;
  public abstract handleError(event: ILogErrorEvent): void;
}

export class StreamHandler extends BaseHandler {
  private streamError: WriteStream;
  constructor(
    logger: Logger,
    level: number,
    private stream: WriteStream,
    streamError: WriteStream,
    private formatter?: Partial<IFormatter>
  ) {
    super(logger, level);
    if (!streamError) this.streamError = this.stream;
    else this.streamError = streamError;
  }

  public handleMessage(event: ILogEvent) {
    if (this.stream.writable) {
      const msg = this.formatter && this.formatter.message ? this.formatter.message(event) : event.message;
      this.stream.write(msg);
      if (!msg.endsWith("\n")) this.stream.write("\n");
    }
  }

  public handleError(event: ILogErrorEvent) {
    if (this.stream.writable) {
      const msg = this.formatter && this.formatter.error ? this.formatter.error(event) : event.message;
      this.streamError.write(msg);
      if (!msg.endsWith("\n")) this.streamError.write("\n");
    }
  }
}

export class FileHandler extends StreamHandler {
  constructor(logger: Logger, level: number, filename: string, formatter?: Partial<IFormatter>) {
    const stream = createWriteStream(filename);
    super(logger, level, stream, stream, formatter);
  }

  public handleError(event: ILogErrorEvent) {
    event.message = "E: " + event.message;
    super.handleError(event);
  }
}
