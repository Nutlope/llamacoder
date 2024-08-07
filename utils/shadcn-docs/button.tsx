export const name = "Button";

export const usage = `
import { Button } from "/components/ui/button"
 
export function Demo() {
  return (
    <div>
      <Button>A normal button</Button>
      <Button variant='secondary'>Button</Button>
      <Button variant='destructive'>Button</Button>
      <Button variant='outline'>Button</Button>
      <Button variant='ghost'>Button</Button>
      <Button variant='link'>Button</Button>
    </div>
  )
}
`;
