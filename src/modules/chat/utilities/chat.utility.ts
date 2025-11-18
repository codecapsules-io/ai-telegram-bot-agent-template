import {
  ChatPromptContentTextDto,
  ChatPromptDto,
  ChatPromptContentImageDto,
  ChatPromptContentFileDto,
  ChatPromptContentType,
} from "../dto";
import { AgentMessage, AgentMessageRole } from "../../agent";

export class ChatUtility {
  static convertToAgentMessage(prompt: ChatPromptDto): AgentMessage {
    return {
      role: AgentMessageRole.USER,
      content: prompt.content.map((content) => {
        switch (content.type) {
          case ChatPromptContentType.TEXT:
            const textContent = content as ChatPromptContentTextDto;
            return {
              type: "text",
              text: textContent.text,
            };
          case ChatPromptContentType.IMAGE:
            const imageContent = content as ChatPromptContentImageDto;
            return {
              type: "image",
              name: imageContent.name,
              base64: imageContent.base64,
            };
          case ChatPromptContentType.FILE:
            const fileContent = content as ChatPromptContentFileDto;
            return {
              type: "file",
              name: fileContent.name,
              text: fileContent.text,
            };
        }
      }),
      date: prompt.date,
    };
  }
}
