import { Avatar as ShadAvatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export const Avatar = ({
  roomId,
  userId,
  username,
}: {
  roomId?: string;
  userId?: string;
  username?: string;
}) => {
  return (
    <ShadAvatar>
      <AvatarImage
        src={`${window.ENV.API_URL}/${userId ? "user-" : ""}image/${
          userId ?? roomId
        }`}
      />
      <AvatarFallback>{username ?? "?"}</AvatarFallback>
    </ShadAvatar>
  );
};
