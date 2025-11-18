import { BaseMessage as LangchainBaseMessage } from "langchain";

import {
  AgentMessage,
  AgentMessageChunk,
  AgentStreamChunkResponse,
  AgentMessageRole,
  AgentMessageContent,
} from "../types";

export class AgentUtility {
  static convertToLangchainFormat(messages: AgentMessage[]) {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content
        .filter((content) => content !== undefined)
        .map((content) => {
          return AgentUtility.convertToLangchainMessage(content);
        }),
    }));
  }

  static convertToAgentMessage(messages: LangchainBaseMessage[]): AgentMessage {
    const emptyResponse: AgentMessage = {
      role: AgentMessageRole.ASSISTANT,
      content: [],
      date: new Date(),
    };

    if (messages.length === 0) return emptyResponse;

    const agentMessages: AgentMessage[] = messages
      .filter((msg) => msg.type === "ai")
      .map((msg) => ({
        role: AgentMessageRole.ASSISTANT,
        content: [
          {
            type: "text",
            text: msg.content.toString(),
          },
        ],
        date: new Date(),
      }));

    if (agentMessages.length === 0) return emptyResponse;

    return agentMessages[agentMessages.length - 1];
  }

  static convertToLangchainMessage(content: AgentMessageContent) {
    switch (content.type) {
      case "text":
        return {
          type: "text",
          text: content.text,
        };
      case "image":
        return {
          type: "image_url",
          image_url: content.base64,
        };
      case "file":
        return {
          type: "text",
          text: `This is one of the files, named "${content.name}". The contents of the file are:\n${content.text}`,
        };

      default:
        return {
          type: "text",
          text: content["text"] ?? "",
        };
    }
  }

  static convertToAgentChunks(
    chunk: AgentStreamChunkResponse
  ): AgentMessageChunk[] {
    return chunk.contentBlocks.map((block) => ({
      role: AgentMessageRole.ASSISTANT,
      chunk: block.text,
    }));
  }
}
