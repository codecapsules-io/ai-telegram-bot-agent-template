import { createHash } from "crypto";
import { BaseStore, InMemoryStore } from "@langchain/core/stores";
import { RedisByteStore } from "@langchain/community/storage/ioredis";

import { RedisClient } from "../../redis";
import { AgentMessage } from "../../agent";
import { TextDecoder, TextEncoder } from "util";
import { EmbeddingsService } from "../../embeddings";

export class MemoryService {
  private static instance: MemoryService;

  static init() {
    if (this.instance) {
      return;
    }
    this.instance = new MemoryService();
  }

  static getInstance(): MemoryService {
    if (!this.instance) {
      throw new Error("MemoryStoreService not initialized");
    }
    return this.instance;
  }

  private readonly redis: RedisClient;
  private readonly embeddingsService: EmbeddingsService;

  public readonly store!: BaseStore<string, Uint8Array<ArrayBufferLike>>;

  private readonly encoder: TextEncoder;
  private readonly decoder: TextDecoder;

  private constructor() {
    this.redis = RedisClient.getInstance();
    this.embeddingsService = EmbeddingsService.getInstance();

    this.encoder = new TextEncoder();
    this.decoder = new TextDecoder();

    if (!this.embeddingsService.model) return;

    if (this.redis.connected) {
      this.store = this.createRedisBasedStore();
    } else {
      this.store = this.createInMemoryStore();
    }
  }

  private createRedisBasedStore() {
    return new RedisByteStore({
      client: this.redis.ioClient,
    });
  }

  private createInMemoryStore() {
    return new InMemoryStore({
      index: {
        embeddings: this.embeddingsService.model,
        dims: this.embeddingsService.dimensions,
      },
    });
  }

  addMessages(chatId: string, messages: AgentMessage[]) {
    if (!this.store) return;

    const keyValPairs: [string, Uint8Array<ArrayBufferLike>][] = messages.map(
      (message) => [this.generateKey(chatId, message), this.encode(message)]
    );

    return this.store.mset(keyValPairs);
  }

  private generateKey(chatId: string, message: AgentMessage) {
    return `messages:chat:${chatId}:${this.generateHash(message)}:${this.getTimestamp()}`;
  }

  private generateHash(message: AgentMessage) {
    return createHash("sha256")
      .update(JSON.stringify(message))
      .digest("base64");
  }

  private getTimestamp() {
    return new Date().toISOString();
  }

  private encode(message: AgentMessage) {
    return this.encoder.encode(JSON.stringify(message));
  }

  async getMessages(chatId: string) {
    if (!this.store) return [];

    const keys = await this.getAllKeys(chatId);
    if (keys.length === 0) return [];

    const messages = await this.store.mget(keys);
    return messages
      .filter((message) => message !== undefined)
      .map((message) => JSON.parse(this.decode(message)) as AgentMessage)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async clearMessages(chatId: string) {
    if (!this.store) return;

    const keys = await this.getAllKeys(chatId);
    if (keys.length === 0) return;

    return this.store.mdelete(keys);
  }

  private async getAllKeys(chatId: string) {
    if (!this.store) return [];

    const chatKey = this.getChatKey(chatId);

    const yieldedKeys: string[] = [];
    for await (const key of this.store.yieldKeys(chatKey)) {
      yieldedKeys.push(key);
    }

    return yieldedKeys;
  }

  private getChatKey(chatId: string) {
    return `messages:chat:${chatId}`;
  }

  private decode(data: Uint8Array) {
    return this.decoder.decode(data);
  }
}
