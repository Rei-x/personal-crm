import { env } from "../env";

export enum NtfyTag {
  PLUS_ONE = "+1",
  PARTYING_FACE = "partying_face",
  TADA = "tada",
  HEAVY_CHECK_MARK = "heavy_check_mark",
  LOUDSPEAKER = "loudspeaker",
  MINUS_ONE = "-1",
  WARNING = "warning",
  ROTATING_LIGHT = "rotating_light",
  TRIANGULAR_FLAG_ON_POST = "triangular_flag_on_post",
  SKULL = "skull",
  FACEPALM = "facepalm",
  NO_ENTRY = "no_entry",
  NO_ENTRY_SIGN = "no_entry_sign",
  CD = "cd",
  COMPUTER = "computer",
}

export const ntfy = () => {
  return {
    notify: ({
      message,
      title,
      icon,
      tags,
    }: {
      message: string;
      title: string;
      icon?: string;
      tags?: NtfyTag[];
    }) => {
      return fetch(`https://ntfy.sh`, {
        method: "POST",
        body: JSON.stringify({
          topic: env.TOPIC_NAME,
          title,
          message,
          tags,
          icon,
        }),
      });
    },
  };
};
