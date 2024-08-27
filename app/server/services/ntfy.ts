import { env } from "../env";

// Tag	Emoji
// +1	👍
// partying_face	🥳
// tada	🎉
// heavy_check_mark	✔️
// loudspeaker	📢
// ...	...

// Tag	Emoji
// -1	👎️
// warning	⚠️
// rotating_light	️🚨
// triangular_flag_on_post	🚩
// skull	💀
// ...	...

// Tag	Emoji
// facepalm	🤦
// no_entry	⛔
// no_entry_sign	🚫
// cd	💿
// computer	💻
// ...	...

enum Tag {
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
      tags?: Tag[];
    }) => {
      const headers = new Headers({
        Title: title,
      });

      if (icon) {
        headers.set("Icon", icon);
      }

      if (tags) {
        headers.set("Tags", tags.join(","));
      }

      return fetch(`https://ntfy.sh/${env.TOPIC_NAME}`, {
        method: "POST",
        body: message,
        headers,
      });
    },
  };
};
