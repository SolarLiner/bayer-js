import { createWriteStream } from "fs";
import { IncomingMessage } from "http";
import { tmpdir } from "os";
import { join } from "path";
import { parse } from "querystring";
import { StringDecoder } from "string_decoder";

import Busboy from "busboy";

export interface IUploadedFiles {
  [x: string]: {
    /**
     * MIME type of the uploaded object.
     * @example "image/png"
     */
    mimetype: string;
    /**
     * Path of the temporary file containing the uploaded file.
     */
    filepath: string;
    /**
     * Original file name when uploaded.
     */
    filename: string;
  };
}

export interface IFormData<T> {
  data: T;
  files: IUploadedFiles;
}

export class Request extends IncomingMessage {
  public static fromMessage(req: IncomingMessage) {
    return new Request(req.socket);
  }

  public async json<T = any>(): Promise<T> {
    return JSON.parse(await this.body());
  }

  public async formData<T = any>() {
    const busboy = new Busboy({ headers: this.headers });
    const body: IFormData<T> = {
      data: {} as T,
      files: {}
    };

    return new Promise<IFormData<T>>((resolve, reject) => {
      busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
        const fn = `${fieldname.toLowerCase()}-${filename.toLowerCase()}`;
        const filepath = join(tmpdir(), fn);
        file.pipe(createWriteStream(filepath));
        body.files[fieldname] = { filename, filepath, mimetype };
      });
      busboy.on("field", (fieldname, val) => {
        (body.data as any)[fieldname] = val;
      });
      busboy.on("finish", () => {
        resolve(body);
      });
      this.pipe(busboy);
    });
  }

  public async urlEncoded() {
    return parse(await this.body());
  }

  public body() {
    return new Promise<string>((resolve, reject) => {
      const d = new StringDecoder();
      let payload = "";
      this.on("data", chunk => (payload += d.write(chunk)));
      this.on("end", () => resolve(payload + d.end()));
      this.on("error", err => reject(err));
      this.on("close", () => {
        console.log("Connection closed.");
        resolve(payload + d.end());
      });
    });
  }
}
