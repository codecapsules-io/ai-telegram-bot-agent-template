import {
  RagService,
  RedisClient,
  ChatService,
  MemoryService,
  EmbeddingsService,
  ChatHistoryService,
  TelegramBotService,
  FileService,
} from "./modules";

export async function init() {
  await RedisClient.init();
  EmbeddingsService.init();
  RagService.init();
  MemoryService.init();
  ChatHistoryService.init();
  await ChatService.init();
  FileService.init();
  TelegramBotService.init();
}
