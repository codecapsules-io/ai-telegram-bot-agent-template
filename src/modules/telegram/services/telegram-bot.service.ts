import https from "https";
import path from "path";
import fs from "fs";
import TelegramBot from "node-telegram-bot-api";

import { config } from "../../../config";
import { ChatService, ChatPromptDto, ChatPromptContentType } from "../../chat";
import { FileService } from "../../files";
import { AgentMessageContentText } from "../../agent";

export class TelegramBotService {
  private static instance: TelegramBotService;
  private readonly chatService: ChatService;
  private readonly fileService: FileService;
  private bot: TelegramBot;

  static init() {
    if (this.instance) {
      return;
    }
    this.instance = new TelegramBotService();
  }

  static getInstance(): TelegramBotService {
    if (!this.instance) {
      throw new Error("TelegramBotService not initialized");
    }
    return this.instance;
  }

  private constructor() {
    this.chatService = ChatService.getInstance();
    this.fileService = FileService.getInstance();

    this.bot = this.initChatbot();
  }

  private initChatbot() {
    const bot = new TelegramBot(config.telegramBotToken, {
      polling: true,
    });

    bot.on("message", async (msg) => {
      try {
        await this.handleMessage(msg);
      } catch (error) {
        console.error(error);
      }
    });

    return bot;
  }

  private async handleMessage(msg: TelegramBot.Message) {
    const userId = msg.from?.id?.toString() || msg.chat.id.toString();
    const messageContents = await this.createMessageContents(msg);

    if (!messageContents) {
      this.respond(msg, "Could not establish response. Please try again.");
      return;
    }

    const response = await this.chatService.sendMessage(
      messageContents,
      userId
    );

    const textResponse = response.content
      .map((content) => (content.type === "text" ? content.text : ""))
      .join("\n");

    this.respond(msg, textResponse);
  }

  private async createMessageContents(
    msg: TelegramBot.Message
  ): Promise<ChatPromptDto | undefined> {
    const messageContents: ChatPromptDto = {
      content: [],
      date: new Date(),
    };

    // text part of message
    if (msg.text) {
      messageContents.content.push({
        type: ChatPromptContentType.TEXT,
        text: msg.text,
      });
    }

    // attached photo
    if (msg.photo) {
      const file = msg.photo.at(-1);
      if (file) {
        const photoBuffer = await this.bot.getFile(file.file_id);
        await this.addImageToMessageContents(messageContents, photoBuffer);
      }
    }

    // attached document (can be image or file)
    if (msg.document && msg.document.mime_type) {
      const file = await this.bot.getFile(msg.document.file_id);
      if (file) {
        if (msg.document.mime_type.startsWith("image/")) {
          await this.addImageToMessageContents(messageContents, file);
        } else {
          await this.addFileToMessageContents(
            messageContents,
            file,
            msg.document?.file_name || "unknown"
          );
        }
      }
    }

    return messageContents;
  }

  private async addImageToMessageContents(
    messageContents: ChatPromptDto,
    image: TelegramBot.File,
    imageName?: string
  ): Promise<void> {
    const photoBase64 = await this.convertImageToBase64(image, {
      defaultExtension: "jpg",
    });

    const fileName =
      imageName ||
      messageContents.content.push({
        type: ChatPromptContentType.IMAGE,
        name: imageName || image.file_path?.split("/").pop() || "unknown",
        base64: photoBase64,
      });
  }

  private async addFileToMessageContents(
    messageContents: ChatPromptDto,
    file: TelegramBot.File,
    fileName: string
  ): Promise<void> {
    const fileText = await this.getFileContents(file);

    messageContents.content.push({
      type: ChatPromptContentType.FILE,
      name: fileName,
      text: fileText,
    });
  }

  private async convertImageToBase64(
    file: TelegramBot.File,
    options: { defaultExtension: string }
  ): Promise<string> {
    const downloadedFile = await this.downloadFile(file);
    const base64 = await this.fileService.convertFileToBase64(downloadedFile);
    await this.fileService.deleteFile(downloadedFile);

    const fileExtension =
      file.file_path?.split(".").pop()?.toLowerCase() ||
      options.defaultExtension;

    const mimeType = this.fileService.getMimeTypeFromExtension(fileExtension);

    const dataUrl = `data:${mimeType};base64,${base64}`;

    return dataUrl;
  }

  private async getFileContents(file: TelegramBot.File): Promise<string> {
    const downloadedFile = await this.downloadFile(file);
    const fileText = await this.fileService.readFile(downloadedFile);
    await this.fileService.deleteFile(downloadedFile);
    return fileText;
  }

  private async downloadFile(file: TelegramBot.File): Promise<string> {
    const dir = this.fileService.createTmpDir();

    const downloadUrl = `https://api.telegram.org/file/bot${config.telegramBotToken}/${file.file_path}`;

    const destinationPath = path.join(dir, file.file_path!);

    await this.fileService.downloadFile(downloadUrl, destinationPath);

    return destinationPath;
  }

  private respond(msg: TelegramBot.Message, text: string) {
    this.bot.sendMessage(msg.chat.id, text);
  }
}
