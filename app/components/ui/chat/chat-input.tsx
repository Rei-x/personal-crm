import { cn } from "@/lib/utils";
import { MentionsInput, type MentionsInputProps } from "react-mentions";
import { textAreaVariants } from "../textarea";

const ChatInput = ({
  className,
  value,
  onKeyDown,
  onChange,
  placeholder,
  ...props
}: MentionsInputProps) => (
  <MentionsInput
    autoComplete="off"
    value={value}
    style={{
      control: {
        backgroundColor: "#fff",
        fontSize: 14,
        fontWeight: "normal",
      },

      "&multiLine": {
        control: {
          fontFamily: "monospace",
          minHeight: 63,
        },
        highlighter: {
          padding: 9,
          border: "1px solid transparent",
        },
        input: {
          padding: 9,
          border: "1px solid silver",
        },
      },

      "&singleLine": {
        display: "inline-block",
        width: 180,

        highlighter: {
          padding: 1,
          border: "2px inset transparent",
        },
        input: {
          padding: 1,
          border: "2px inset",
        },
      },

      suggestions: {
        list: {
          backgroundColor: "white",
          border: "1px solid rgba(0,0,0,0.15)",
          fontSize: 14,
        },
        item: {
          padding: "5px 15px",
          borderBottom: "1px solid rgba(0,0,0,0.15)",
          "&focused": {
            backgroundColor: "#cee4e5",
          },
        },
      },
    }}
    onKeyDown={onKeyDown}
    onChange={onChange}
    name="message"
    placeholder={placeholder}
    className={textAreaVariants({
      className: cn(
        "max-h-12 px-4 py-3 bg-background text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 w-full rounded-md flex items-center h-12 resize-none",
        className
      ),
    })}
    {...props}
  />
);

export { ChatInput };
