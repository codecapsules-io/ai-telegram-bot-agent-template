export interface ChatPromptDto {
  content: ChatPromptContent[];
  date: Date;
}

export enum ChatPromptContentType {
  TEXT = "text",
  IMAGE = "image",
  FILE = "file",
}

export type ChatPromptContent =
  | ChatPromptContentTextDto
  | ChatPromptContentImageDto
  | ChatPromptContentFileDto;

export interface ChatPromptContentDto {
  type: ChatPromptContentType;
}

export interface ChatPromptContentTextDto extends ChatPromptContentDto {
  type: ChatPromptContentType.TEXT;
  text: string;
}

export interface ChatPromptContentImageDto extends ChatPromptContentDto {
  type: ChatPromptContentType.IMAGE;
  name: string;
  base64: string;
}

export interface ChatPromptContentFileDto extends ChatPromptContentDto {
  type: ChatPromptContentType.FILE;
  name: string;
  text: string;
}
