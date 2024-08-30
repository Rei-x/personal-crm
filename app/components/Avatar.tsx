import { Avatar as ShadAvatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export const Avatar = ({
  roomId,
  username,
}: {
  roomId: string;
  username?: string;
}) => {
  return (
    <ShadAvatar>
      <AvatarImage src={`${window.ENV.API_URL}/image/${roomId}`} />
      <AvatarFallback>{username ?? "?"}</AvatarFallback>
    </ShadAvatar>
  );
};
