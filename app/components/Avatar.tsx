import { Avatar as ShadAvatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export const Avatar = ({
  userId,
  username,
}: {
  userId: string;
  username?: string;
}) => {
  return (
    <ShadAvatar>
      <AvatarImage src={`/api/user-image/${userId}`} />
      <AvatarFallback>{username ?? "?"}</AvatarFallback>
    </ShadAvatar>
  );
};
