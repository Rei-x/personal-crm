import { eq } from "drizzle-orm";

import debugLib from "debug";
import { db } from "../db";
import * as fs from "node:fs/promises";
import { processedEvents, roomSettings } from "../schema";
import path from "path";
import { env } from "../env";
import { v4 as uuidv4 } from "uuid";
import fetch from "node-fetch";
import { createReadStream, createWriteStream } from "node:fs";
import { openai } from "../services/openai";
import { client, sdk } from "../services/matrix";

const log = debugLib("app:log");
const errorLog = debugLib("app:error");

const transcribeAudio = async (httpUrl: string, userDisplayName: string, eventId: string) => {
  try {
    log("Starting transcription for URL: %s, User: %s", httpUrl, userDisplayName);

    // Download the audio file using fetch with streaming
    const response = await fetch(httpUrl, {
      headers: {
        Authorization: `Bearer ${client.getAccessToken()}`,
      },
    });
    if (!response.ok) throw new Error(`Failed to fetch audio file: ${response.statusText}`);

    const audioFilePath = path.join(env.TEMP_DIR, `${uuidv4()}.ogg`);
    await fs.mkdir(path.dirname(audioFilePath), { recursive: true });

    const fileStream = createWriteStream(audioFilePath);
    response.body?.pipe(fileStream);

    await new Promise((resolve, reject) => {
      fileStream.on("finish", resolve);
      fileStream.on("error", reject);
    });

    log("Downloaded audio file to %s", audioFilePath);

    // Transcribe the audio file using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: createReadStream(audioFilePath),
    });

    log("Received transcription: %O", transcription);

    // Update the event with the enhanced transcription AND display name
    await db
      .update(processedEvents)
      .set({
        transcription: transcription.text,
        userDisplayName,
      })
      .where(eq(processedEvents.eventId, eventId));

    // Clean up temporary audio file
    await fs.unlink(audioFilePath);
    log("Deleted temporary audio file: %s", audioFilePath);

    return transcription.text;
  } catch (error) {
    errorLog("Error processing audio file: %O", error);
  }
};

export const enableSpeechToText = () => {
  client.on(sdk.RoomEvent.Timeline, async (event, room) => {
    if (event.getType() === (sdk.EventType.RoomMessage as string)) {
      log("Received message in room: %s", room?.roomId);
      log("Message content: %s", JSON.stringify(event.getContent(), null, 2));
    }

    const eventId = event.getId();

    if (!eventId) return;

    const { alreadyProcessed } = await db.transaction(async (tx) => {
      const rowEvent = await tx.query.processedEvents.findFirst({
        where: eq(processedEvents.eventId, eventId),
      });
      if (rowEvent) {
        log("Event %s has already been processed", eventId);

        return {
          alreadyProcessed: true,
        };
      }

      await tx.insert(processedEvents).values({
        eventId,
      });

      return {
        alreadyProcessed: false,
      };
    });

    if (alreadyProcessed) {
      return;
    }

    if (event.getType() === "m.room.message" && event.getContent().msgtype === sdk.MsgType.Text) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- matrix-js-sdk types
      const body = event.getContent().body;
      const roomId = room?.roomId;
      const eventId = event.getId();
      const sender = event.getSender();

      if (!roomId || !eventId || !sender) return;

      log("Received message in room: %s", roomId);
      log("Message content: %s", JSON.stringify(event.getContent(), null, 2));

      // Command to enable transcription
      if (body === "!devEnableTranscription") {
        log("Enabling transcription for room: %s", roomId);
        await db
          .insert(roomSettings)
          .values({
            roomId,
            transcriptionEnabled: true,
          })
          .onConflictDoUpdate({
            set: {
              transcriptionEnabled: true,
            },
            target: roomSettings.roomId,
          });

        await client.sendEvent(roomId, sdk.EventType.Reaction, {
          "m.relates_to": {
            event_id: eventId,
            key: "✅",
            rel_type: sdk.RelationType.Annotation,
          },
        });
        log("Transcription enabled for room: %s", roomId);
        return;
      }

      // Command to disable transcription
      if (body === "!devDisableTranscription") {
        log("Disabling transcription for room: %s", roomId);

        await db
          .insert(roomSettings)
          .values({
            roomId,
            transcriptionEnabled: false,
          })
          .onConflictDoUpdate({
            set: {
              transcriptionEnabled: false,
            },
            target: roomSettings.roomId,
          });

        await client.sendEvent(roomId, sdk.EventType.Reaction, {
          "m.relates_to": {
            event_id: eventId,
            key: "✅",
            rel_type: sdk.RelationType.Annotation,
          },
        });
        log("Transcription disabled for room: %s", roomId);
        return;
      }
    }

    if (event.getType() === "m.room.message" && event.getContent().msgtype === sdk.MsgType.Audio) {
      const roomId = room?.roomId;
      if (!roomId) return;

      const row = await db.query.roomSettings.findFirst({
        where: eq(roomSettings.roomId, roomId),
      });

      if (!row || !row.transcriptionEnabled) {
        log("Transcription is disabled for room: %s", roomId);
        return;
      }

      const eventId = event.getId();
      if (!eventId) return;

      const sender = event.getSender();
      const user = sender ? client.getUser(sender) : null;

      if (!user) return;

      log("Received audio message from user: %s", user.displayName);
      log("Audio message content: %O", event.getContent());

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- matrix-js-sdk types
      const contentUrl = event.getContent().url;
      const httpUrl = client.mxcUrlToHttp(
        contentUrl,
        /*width=*/ undefined, // part of the thumbnail API. Use as required.
        /*height=*/ undefined, // part of the thumbnail API. Use as required.
        /*resizeMethod=*/ undefined, // part of the thumbnail API. Use as required.
        /*allowDirectLinks=*/ false, // should generally be left `false`.
        /*allowRedirects=*/ true, // implied supported with authentication
        /*useAuthentication=*/ true, // the flag we're after in this example
      );

      log("Converted content URL to HTTP URL: %s", httpUrl);

      if (!httpUrl || !user.displayName) return;

      const text = await transcribeAudio(httpUrl, user.displayName, eventId);

      if (text) {
        await client.sendMessage(roomId, {
          msgtype: sdk.MsgType.Text,
          body: `Transkrypcja:\n${text}`,
          format: "org.matrix.custom.html",
          formatted_body: `<strong>Transkrypcja</strong>:\n${text}`,
          "m.relates_to": {
            "m.in_reply_to": {
              event_id: eventId,
            },
          },
        });
      }
    }
  });
};
