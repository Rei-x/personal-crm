import { Avatar as ShadAvatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export const Avatar = ({
  roomId,
  userId,
  username,
  className,
}: {
  roomId?: string;
  userId?: string;
  username?: string;
  className?: string;
}) => {
  return (
    <ShadAvatar className={className}>
      <AvatarImage
        src={`${window.ENV.API_URL}/${userId ? "user-" : ""}image/${
          userId ?? roomId
        }`}
      />
      <AvatarFallback>{username ?? "?"}</AvatarFallback>
    </ShadAvatar>
  );
};
