import { AgentMessageRole } from "./agent-role.types";

export interface AgentMessage {
  role: AgentMessageRole;
  content: AgentMessageContent[];
  date: Date;
}

export enum AgentMessageContentType {
  TEXT = "text",
  IMAGE = "image",
  FILE = "file",
}

export type AgentMessageContent =
  | AgentMessageContentText
  | AgentMessageContentImage
  | AgentMessageContentFile;

export interface AgentMessageContentText {
  type: "text";
  text: string;
}

export interface AgentMessageContentImage {
  type: "image";
  name: string;
  base64: string;
}

export interface AgentMessageContentFile {
  type: "file";
  name: string;
  text: string;
}
