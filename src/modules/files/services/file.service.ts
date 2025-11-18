import https from "https";
import path from "path";
import fs from "fs";

export class FileService {
  private static instance: FileService;

  static init() {
    if (this.instance) {
      return;
    }
    this.instance = new FileService();
  }

  static getInstance(): FileService {
    if (!this.instance) {
      throw new Error("FileService not initialized");
    }
    return this.instance;
  }

  private constructor() {}

  public downloadFile(downloadUrl: string, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const directory = path.dirname(filePath);
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }

      const fileStream = fs.createWriteStream(filePath);

      https
        .get(downloadUrl, (res) => {
          if (res.statusCode && res.statusCode >= 400) {
            fileStream.close();
            fs.unlinkSync(filePath);
            console.error("HTTP error: ", res.statusCode, res.statusMessage);
            reject(
              new Error(`HTTP error: ${res.statusCode} ${res.statusMessage}`)
            );
            return;
          }

          res.pipe(fileStream);

          fileStream.on("finish", () => {
            fileStream.close();
            resolve();
          });

          fileStream.on("error", (err) => {
            console.error("error from filestream downloading file", err);
            fileStream.close();
            try {
              fs.unlinkSync(filePath);
            } catch (unlinkErr) {}
            reject(err);
          });
        })
        .on("error", (err) => {
          console.error("error from http downloading file", err);
          fileStream.close();
          try {
            fs.unlinkSync(filePath);
          } catch (unlinkErr) {}
          reject(err);
        });
    });
  }

  public createTmpDir(): string {
    const tmpDir = path.join(process.cwd(), "tmp", "telegram-bot");
    if (fs.existsSync(tmpDir)) return tmpDir;

    fs.mkdirSync(tmpDir, { recursive: true });
    return tmpDir;
  }

  public getMimeTypeFromExtension(extension: string): string {
    const mimeTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      bmp: "image/bmp",
    };

    return mimeTypes[extension] || "image/jpeg";
  }

  public convertFileToBase64(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, (err, data) => {
        if (err) reject(err);
        resolve(data.toString("base64"));
      });
    });
  }

  public readFile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, (err, data) => {
        if (err) reject(err);
        resolve(data.toString());
      });
    });
  }

  public deleteFile(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.unlink(filePath, (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  }
}
