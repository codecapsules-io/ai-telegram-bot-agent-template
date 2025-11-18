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
        }
      }
    }

    return messageContents;
  }

  private async addImageToMessageContents(
    messageContents: ChatPromptDto,
    image: TelegramBot.File
  ): Promise<void> {
    const photoBase64 = await this.convertPhotoToBase64(image);

    messageContents.content.push({
      type: ChatPromptContentType.IMAGE,
      name: image.file_path!,
      base64: photoBase64,
    });
  }

  private async convertPhotoToBase64(photo: TelegramBot.File): Promise<string> {
    const downloadedFile = await this.downloadPhoto(photo);
    const base64 = await this.fileService.convertFileToBase64(downloadedFile);
    await this.fileService.deleteFile(downloadedFile);

    const fileExtension =
      photo.file_path?.split(".").pop()?.toLowerCase() || "jpg";

    const mimeType = this.fileService.getMimeTypeFromExtension(fileExtension);

    const dataUrl = `data:${mimeType};base64,${base64}`;

    return dataUrl;
  }

  private async downloadPhoto(photo: TelegramBot.File): Promise<string> {
    const dir = this.fileService.createTmpDir();

    const downloadUrl = `https://api.telegram.org/file/bot${config.telegramBotToken}/${photo.file_path}`;

    const destinationPath = path.join(dir, photo.file_path!);

    await this.fileService.downloadFile(downloadUrl, destinationPath);

    return destinationPath;
  }

  private respond(msg: TelegramBot.Message, text: string) {
    this.bot.sendMessage(msg.chat.id, text);
  }
}
