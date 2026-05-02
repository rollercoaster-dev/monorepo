import React from "react";
import { TEXT_EVIDENCE_PREFIX } from "../../db";
import type { Evidence } from "../EvidenceThumbnail";
import { tryParseJSON } from "../../utils/evidenceViewers";
import { PhotoContent } from "./PhotoContent";
import { TextContent } from "./TextContent";
import { VideoContent } from "./VideoContent";
import { AudioContent } from "./AudioContent";
import { LinkContent } from "./LinkContent";
import { FileContent } from "./FileContent";

export { PhotoContent } from "./PhotoContent";
export { TextContent } from "./TextContent";
export { VideoContent } from "./VideoContent";
export { AudioContent } from "./AudioContent";
export { LinkContent } from "./LinkContent";
export { FileContent } from "./FileContent";

export interface EvidenceContentProps {
  evidence: Evidence;
}

/**
 * Render the appropriate content component for an evidence item, based on
 * its `type`. Unknown types fall through to FileContent.
 */
export function EvidenceContent({ evidence }: EvidenceContentProps) {
  switch (evidence.type) {
    case "photo":
      return (
        <PhotoContent uri={evidence.uri ?? null} description={evidence.title} />
      );
    case "video":
      return <VideoContent uri={evidence.uri ?? null} />;
    case "text": {
      const text = evidence.uri?.startsWith(TEXT_EVIDENCE_PREFIX)
        ? evidence.uri.slice(TEXT_EVIDENCE_PREFIX.length)
        : evidence.title;
      return (
        <TextContent
          text={text}
          createdAt={evidence.title !== text ? evidence.title : undefined}
        />
      );
    }
    case "voice_memo": {
      if (!evidence.uri) {
        return (
          <FileContent
            uri=""
            description={evidence.title}
            metadata={evidence.metadata}
          />
        );
      }
      const meta = evidence.metadata ? tryParseJSON(evidence.metadata) : null;
      const durationMs =
        meta && typeof meta.durationMs === "number"
          ? meta.durationMs
          : undefined;
      return <AudioContent uri={evidence.uri} durationMs={durationMs} />;
    }
    case "link":
      return (
        <LinkContent uri={evidence.uri ?? ""} description={evidence.title} />
      );
    case "file":
    default:
      return (
        <FileContent
          uri={evidence.uri ?? ""}
          description={evidence.title}
          metadata={evidence.metadata}
        />
      );
  }
}
