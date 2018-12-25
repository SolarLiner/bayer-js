import { WriteStream } from "fs";

import Logger, { ILogErrorEvent, ILogEvent } from ".";

type MessageFormatter = (event: ILogEvent) => string;
type ErrorFormatter = (event: ILogErrorEvent) => string;

interface IFormatter {
  message: MessageFormatter;
  error: ErrorFormatter;
}

export class StreamHandler {
  constructor(private logger: Logger, level: number, private stream: WriteStream, private streamError?: WriteStream, formatter?: Partial<IFormatter>) {
    logger.on("message", (event: ILogEvent) => {
      if (event.level < level) return;
      if (stream.writable) {
        const msg = (formatter && formatter.message) ? formatter.message(event) : event.message;
        stream.write(msg);
        if (!msg.endsWith("\n")) stream.write("\n");
      }
    });
    logger.on("error", (event: ILogEvent | ILogErrorEvent) => {
      stream = !!streamError ? streamError : stream;
      if (event.level < level) return;
      if ((event as ILogErrorEvent).err) {
        if (stream.writable) {
          const msg = (formatter && formatter.error) ? formatter.error(event as ILogErrorEvent) : event.message;
          stream.write("E: ");
          stream.write(msg);
          if (!msg.endsWith("\n"))
            stream.write("\n");
        }
      }
    });
  }
}
