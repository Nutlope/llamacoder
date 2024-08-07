export const name = "Avatar";

export const usage = `
import { Avatar, AvatarFallback, AvatarImage } from "/components/ui/avatar";
 
export function Demo() {
  return (
    <Avatar>
      <AvatarImage src="https://github.com/nutlope.png" />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar>
  )
}
`;
