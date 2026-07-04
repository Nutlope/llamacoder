import CodeRunner from "@/components/code-runner";
import { assemblePreviewFiles } from "@/lib/preview/files";
import SourceInspector from "../preview-poc/source-inspector";

export const dynamic = "force-dynamic";

export const baseuiDemoFiles = [
  {
    path: "src/App.tsx",
    content: `import React from "react";
import { Bell, CheckCircle2, SlidersHorizontal, Sparkles } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ComponentCoverage from "./ComponentCoverage";

export default function App() {
  const [progress, setProgress] = React.useState(64);
  const [notifications, setNotifications] = React.useState(true);

  return (
    <TooltipProvider>
      <main className="min-h-screen bg-zinc-50 p-6 text-zinc-950">
        <div className="mx-auto max-w-7xl space-y-5">
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <Sparkles className="size-4" />
                  Base UI shadcn preview kit
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                  Real component files injected into wasm
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
                  This generated app imports normal shadcn paths. The preview
                  renderer supplies those files from preview-kits/baseui rather
                  than the old Radix string blob.
                </p>
              </div>

              <Dialog>
                <DialogTrigger render={<Button />}>
                  Open dialog
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Dialog is powered by Base UI</DialogTitle>
                    <DialogDescription>
                      Portal, backdrop, popup, focus management, and close
                      behavior are coming from @base-ui/react/dialog.
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {["Editable TSX files", "Generated vfs map", "Same LLM imports"].map((label) => (
                <Card key={label}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CheckCircle2 className="size-4 text-emerald-600" />
                      {label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-zinc-600">
                      Import paths stay under @/components/ui, so generated apps
                      do not need to know which primitive layer is active.
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Tabs defaultValue="form" className="mt-6">
              <TabsList>
                <TabsTrigger value="form">Form controls</TabsTrigger>
                <TabsTrigger value="layout">Disclosure</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="form">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Workspace form</CardTitle>
                    <CardDescription>
                      Inputs, textarea, select, checkbox, and radio group.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="workspace">Workspace name</Label>
                      <Input id="workspace" defaultValue="Llama Labs" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea id="notes" defaultValue="Base UI wrappers should behave like the shadcn components models already import." />
                    </div>
                    <Select defaultValue="baseui">
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Primitive layer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baseui">Base UI</SelectItem>
                        <SelectItem value="radix">Radix legacy</SelectItem>
                        <SelectItem value="native">Native HTML</SelectItem>
                      </SelectContent>
                    </Select>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox defaultChecked />
                      Include generated components in renderer
                    </label>
                    <RadioGroup defaultValue="balanced" className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="fast" />
                        Fast
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="balanced" />
                        Balanced
                      </label>
                    </RadioGroup>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="layout">
                <Accordion type="single" collapsible defaultValue="one">
                  <AccordionItem value="one">
                    <AccordionTrigger>Where do component files live?</AccordionTrigger>
                    <AccordionContent>
                      In preview-kits/baseui. The generated map is only the
                      transport layer for the wasm virtual filesystem.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="two">
                    <AccordionTrigger>Can LLM apps keep using shadcn imports?</AccordionTrigger>
                    <AccordionContent>
                      Yes. The imports stay @/components/ui/* while the injected
                      implementation changes underneath.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>

              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <SlidersHorizontal className="size-5" />
                      Interaction checks
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="flex items-center justify-between rounded-md border border-zinc-200 p-3">
                      <div>
                        <p className="font-medium">Notifications</p>
                        <p className="text-sm text-zinc-500">Switch state: {notifications ? "on" : "off"}</p>
                      </div>
                      <Switch checked={notifications} onCheckedChange={setNotifications} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Completion</Label>
                      <Slider value={progress} onValueChange={(value) => setProgress(Array.isArray(value) ? value[0] : value)} />
                      <Progress value={progress} />
                    </div>
                    <Popover>
                      <PopoverTrigger render={<Button variant="outline" />}>
                        <Bell className="size-4" />
                        Open popover
                      </PopoverTrigger>
                      <PopoverContent>
                        <p className="text-sm font-medium">Popover rendered</p>
                        <p className="mt-1 text-sm text-zinc-600">
                          Positioning is handled by @base-ui/react/popover.
                        </p>
                      </PopoverContent>
                    </Popover>
                    <Tooltip>
                      <TooltipTrigger render={<Button variant="ghost" />}>
                        Hover for tooltip
                      </TooltipTrigger>
                      <TooltipContent>Base UI tooltip</TooltipContent>
                    </Tooltip>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </section>

          <aside className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Expected architecture</CardTitle>
                <CardDescription>
                  Real files first; generated strings only at the renderer boundary.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-zinc-600">
                <p>1. Edit preview-kits/baseui/components/ui/*.tsx.</p>
                <p>2. Run pnpm generate:baseui-preview.</p>
                <p>3. Renderer injects lib/preview/generated/baseui-files.ts.</p>
              </CardContent>
            </Card>
          </aside>
        </div>
        <ComponentCoverage />
        </div>
      </main>
    </TooltipProvider>
  );
}
`,
  },
  {
    path: "src/ComponentCoverage.tsx",
    content: `import React from "react";
import { Line, LineChart, CartesianGrid, XAxis } from "recharts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Toaster as SonnerToaster, toast as sonnerToast } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useToast } from "@/hooks/use-toast";
import OfficialCoverage from "./OfficialCoverage";

const chartData = [
  { day: "Mon", builds: 12 },
  { day: "Tue", builds: 18 },
  { day: "Wed", builds: 11 },
  { day: "Thu", builds: 24 },
  { day: "Fri", builds: 20 },
];

const rows = [
  { component: "scroll-area", status: "added", path: "@/components/ui/scroll-area" },
  { component: "use-toast", status: "aliased", path: "@/hooks/use-toast + @/components/ui/use-toast" },
  { component: "sonner", status: "added", path: "@/components/ui/sonner" },
  { component: "chart", status: "added", path: "@/components/ui/chart" },
  { component: "dropdown-menu", status: "added", path: "@/components/ui/dropdown-menu" },
  { component: "alert-dialog", status: "added", path: "@/components/ui/alert-dialog" },
];

export default function ComponentCoverage() {
  const { toast } = useToast();
  const [menuChecked, setMenuChecked] = React.useState(true);
  const [toggleValue, setToggleValue] = React.useState("bold");

  return (
    <>
      <Toaster />
      <SonnerToaster />
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Component coverage gauntlet</CardTitle>
          <CardDescription>
            Extra path-shape checks for components models already import.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Alert>
            <AlertTitle>Coverage, not docs</AlertTitle>
            <AlertDescription>
              This section proves imports, render paths, and simple interactions.
            </AlertDescription>
          </Alert>

          <div className="flex flex-wrap gap-2">
            <Badge>badge</Badge>
            <Badge variant="secondary">secondary</Badge>
            <Badge variant="outline">outline</Badge>
            <Badge variant="destructive">destructive</Badge>
          </div>

          <Separator />

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                toast({
                  title: "use-toast fired",
                  description: "Imported from @/hooks/use-toast.",
                })
              }
            >
              Fire use-toast
            </Button>
            <Button
              variant="outline"
              onClick={() => sonnerToast.success("Sonner fired")}
            >
              Fire sonner
            </Button>
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="outline" />}>
                Open alert dialog
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Alert dialog rendered</AlertDialogTitle>
                  <AlertDialogDescription>
                    This checks the shadcn alert-dialog export shape.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction>Continue</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="grid gap-3">
            <Input type="search" placeholder="Search input compatibility" />
            <ScrollArea className="h-28 rounded-md border border-zinc-200">
              <div className="space-y-2 p-3 text-sm">
                {Array.from({ length: 12 }).map((_, index) => (
                  <div key={index} className="rounded bg-zinc-50 px-3 py-2">
                    Scroll row {index + 1}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" />}>
              Open dropdown menu
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuGroup>
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem>Duplicate</DropdownMenuItem>
                <DropdownMenuCheckboxItem checked={menuChecked} onCheckedChange={setMenuChecked}>
                  Show history
                </DropdownMenuCheckboxItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Archive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex flex-wrap items-center gap-2">
            <Toggle defaultPressed>Toggle</Toggle>
            <ToggleGroup>
              <ToggleGroupItem pressed={toggleValue === "bold"} onPressedChange={(pressed) => pressed && setToggleValue("bold")}>B</ToggleGroupItem>
              <ToggleGroupItem pressed={toggleValue === "italic"} onPressedChange={(pressed) => pressed && setToggleValue("italic")}>I</ToggleGroupItem>
              <ToggleGroupItem pressed={toggleValue === "underline"} onPressedChange={(pressed) => pressed && setToggleValue("underline")}>U</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Component</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.component}>
                  <TableCell>{row.component}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{row.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="grid gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>

          <ChartContainer
            config={{ builds: { label: "Builds", color: "#059669" } }}
            className="h-44"
          >
            <LineChart data={chartData} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line dataKey="builds" type="monotone" stroke="#059669" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>

          <OfficialCoverage />
        </CardContent>
      </Card>
    </>
  );
}
`,
  },
  {
    path: "src/OfficialCoverage.tsx",
    content: `import React from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Attachment, AttachmentAction, AttachmentContent, AttachmentDescription, AttachmentMedia, AttachmentTitle } from "@/components/ui/attachment";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Bubble, BubbleContent, BubbleReactions } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from "@/components/ui/button-group";
import { Calendar } from "@/components/ui/calendar";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command";
import { ContextMenu, ContextMenuContent, ContextMenuGroup, ContextMenuItem, ContextMenuLabel, ContextMenuTrigger } from "@/components/ui/context-menu";
import { DataTable } from "@/components/ui/data-table";
import { DatePicker } from "@/components/ui/date-picker";
import { DirectionProvider, useDirection } from "@/components/ui/direction";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
import { Kbd } from "@/components/ui/kbd";
import { Marker, MarkerContent } from "@/components/ui/marker";
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from "@/components/ui/menubar";
import { Message, MessageAvatar, MessageContent, MessageFooter, MessageHeader } from "@/components/ui/message";
import { MessageScroller, MessageScrollerButton, MessageScrollerContent, MessageScrollerItem, MessageScrollerProvider, MessageScrollerViewport } from "@/components/ui/message-scroller";
import { NativeSelect } from "@/components/ui/native-select";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { TypographyBlockquote, TypographyH3, TypographyMuted, TypographyP } from "@/components/ui/typography";

const comboOptions = [
  { value: "baseui", label: "Base UI" },
  { value: "shadcn", label: "shadcn" },
  { value: "wasm", label: "wasm renderer" },
];

const tableRows = [
  { component: "DataTable", status: "rendered" },
  { component: "Direction", status: "ltr" },
];

function DirectionSample() {
  const dir = useDirection();
  return <span className="text-xs text-zinc-500">dir: {dir}</span>;
}

export default function OfficialCoverage() {
  const [combo, setCombo] = React.useState("baseui");
  const [date, setDate] = React.useState<Date | undefined>();
  const [collapsibleOpen, setCollapsibleOpen] = React.useState(true);

  return (
    <div className="space-y-5 rounded-md border border-zinc-200 p-4">
      <div>
        <h3 className="text-sm font-semibold">Official shadcn list coverage</h3>
        <p className="mt-1 text-xs text-zinc-500">
          These are import-shape checks for the newer Base UI component list.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
        <AspectRatio ratio={16 / 9} className="overflow-hidden rounded-md bg-zinc-100">
          <div className="flex h-full items-center justify-center text-sm font-medium">aspect-ratio</div>
        </AspectRatio>

        <Attachment>
          <AttachmentMedia />
          <AttachmentContent>
            <AttachmentTitle>benchmark-results.csv</AttachmentTitle>
            <AttachmentDescription>Attachment import path rendered</AttachmentDescription>
          </AttachmentContent>
          <AttachmentAction aria-label="Remove attachment" />
        </Attachment>

        <div className="flex items-center gap-3 rounded-md border border-zinc-200 p-3">
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" alt="avatar" />
            <AvatarFallback>LC</AvatarFallback>
          </Avatar>
          <div className="text-sm">avatar</div>
        </div>

        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="#">Preview</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Base UI</BreadcrumbPage></BreadcrumbItem>
            <BreadcrumbItem><BreadcrumbEllipsis /></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Bubble variant="secondary" align="start">
          <BubbleContent>Bubble component rendered</BubbleContent>
          <BubbleReactions>actions</BubbleReactions>
        </Bubble>

        <div className="flex items-center gap-2">
          <MessageAvatar>AI</MessageAvatar>
          <Bubble variant="default" align="end">
            <BubbleContent>Sent bubble</BubbleContent>
          </Bubble>
        </div>

        <ButtonGroup>
          <Button variant="outline">Left</Button>
          <ButtonGroupSeparator />
          <ButtonGroupText>group</ButtonGroupText>
          <Button variant="outline">Right</Button>
        </ButtonGroup>

        <Calendar />

        <Carousel>
          <CarouselContent>
            {[1, 2, 3].map((item) => (
              <CarouselItem key={item}>
                <div className="rounded-md bg-zinc-100 p-6 text-center text-sm">slide {item}</div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="mt-2 flex gap-2"><CarouselPrevious /><CarouselNext /></div>
        </Carousel>

        <Collapsible open={collapsibleOpen} onOpenChange={setCollapsibleOpen}>
          <CollapsibleTrigger render={<Button variant="outline" />}>Toggle collapsible</CollapsibleTrigger>
          <CollapsibleContent className="mt-2 rounded-md bg-zinc-50 p-3 text-sm">Collapsible content</CollapsibleContent>
        </Collapsible>

        <Combobox value={combo} onValueChange={(value) => setCombo(value ?? "baseui")}>
          <ComboboxInput placeholder="Combobox" showClear />
          <ComboboxContent>
            <ComboboxEmpty>No result.</ComboboxEmpty>
            <ComboboxList>
              {comboOptions.map((option) => (
                <ComboboxItem key={option.value} value={option.value}>
                  {option.label}
                </ComboboxItem>
              ))}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>

        <Command className="rounded-md border border-zinc-200">
          <CommandInput placeholder="Command search" />
          <CommandList>
            <CommandEmpty>No command found.</CommandEmpty>
            <CommandGroup heading="Actions">
              <CommandItem>Open preview <CommandShortcut>⌘P</CommandShortcut></CommandItem>
              <CommandItem>Run benchmark</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>

        <ContextMenu>
          <ContextMenuTrigger render={<Button variant="outline" />}>Open context menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuGroup>
              <ContextMenuLabel>Context</ContextMenuLabel>
              <ContextMenuItem>Inspect</ContextMenuItem>
            </ContextMenuGroup>
          </ContextMenuContent>
        </ContextMenu>

        <DataTable columns={[{ accessorKey: "component", header: "Component" }, { accessorKey: "status", header: "Status" }]} data={tableRows} />

        <DatePicker value={date} onChange={setDate} />

        <DirectionProvider direction="ltr">
          <div className="rounded-md border border-zinc-200 p-3"><DirectionSample /></div>
        </DirectionProvider>

        <Drawer>
          <DrawerTrigger render={<Button variant="outline" />}>Open drawer</DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Drawer</DrawerTitle>
              <DrawerDescription>Drawer compatibility wrapper.</DrawerDescription>
            </DrawerHeader>
          </DrawerContent>
        </Drawer>

        <Empty>
          <EmptyHeader>
            <EmptyTitle>Empty state</EmptyTitle>
            <EmptyDescription>Empty component rendered.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent><Button variant="outline">Create item</Button></EmptyContent>
        </Empty>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="field-demo">Field label</FieldLabel>
            <FieldContent><FieldDescription>Field description</FieldDescription></FieldContent>
            <FieldError>Field error</FieldError>
          </Field>
        </FieldGroup>

        <HoverCard>
          <HoverCardTrigger render={<Button variant="outline" />}>Hover card</HoverCardTrigger>
          <HoverCardContent>Hover card content</HoverCardContent>
        </HoverCard>

        <InputGroup>
          <InputGroupAddon>$</InputGroupAddon>
          <InputGroupInput placeholder="Input group" />
          <InputGroupButton>Go</InputGroupButton>
        </InputGroup>

        <InputOTP maxLength={4} defaultValue="12">
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSeparator />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
          </InputOTPGroup>
        </InputOTP>

        <Item>
          <ItemContent>
            <ItemTitle>Item title</ItemTitle>
            <ItemDescription>Item description</ItemDescription>
          </ItemContent>
          <ItemActions><Button size="sm" variant="outline">Action</Button></ItemActions>
        </Item>

        <div className="flex items-center gap-2 rounded-md border border-zinc-200 p-3">
          <Kbd>⌘</Kbd><Kbd>K</Kbd><Marker variant="border"><MarkerContent>marker</MarkerContent></Marker>
        </div>

        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>New</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>

        <Message>
          <MessageAvatar>AI</MessageAvatar>
          <MessageContent>
            <MessageHeader>Assistant</MessageHeader>
            <Bubble variant="secondary"><BubbleContent>Message body rendered.</BubbleContent></Bubble>
            <MessageFooter>copy retry</MessageFooter>
          </MessageContent>
        </Message>

        <MessageScrollerProvider>
          <MessageScroller className="h-28 rounded-md border border-zinc-200 p-3">
            <MessageScrollerViewport>
              <MessageScrollerContent>
                <MessageScrollerItem>
                  <Message><MessageContent><Bubble variant="secondary"><BubbleContent>Message scroller row one</BubbleContent></Bubble></MessageContent></Message>
                </MessageScrollerItem>
                <MessageScrollerItem scrollAnchor>
                  <Message><MessageContent><Bubble variant="secondary"><BubbleContent>Message scroller row two</BubbleContent></Bubble></MessageContent></Message>
                </MessageScrollerItem>
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton variant="outline" />
          </MessageScroller>
        </MessageScrollerProvider>

        <NativeSelect defaultValue="baseui">
          <option value="baseui">Base UI</option>
          <option value="radix">Radix</option>
        </NativeSelect>

        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Navigate</NavigationMenuTrigger>
              <NavigationMenuContent>
                <NavigationMenuLink href="#">Docs</NavigationMenuLink>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        <Pagination>
          <PaginationContent>
            <PaginationItem><PaginationPrevious href="#" /></PaginationItem>
            <PaginationItem><PaginationLink href="#" isActive>1</PaginationLink></PaginationItem>
            <PaginationItem><PaginationEllipsis /></PaginationItem>
            <PaginationItem><PaginationNext href="#" /></PaginationItem>
          </PaginationContent>
        </Pagination>

        <ResizablePanelGroup className="h-20 rounded-md border border-zinc-200">
          <ResizablePanel defaultSize={50} className="p-3 text-sm">Panel A</ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50} className="p-3 text-sm">Panel B</ResizablePanel>
        </ResizablePanelGroup>

        <Sheet>
          <SheetTrigger render={<Button variant="outline" />}>Open sheet</SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Sheet</SheetTitle>
              <SheetDescription>Sheet compatibility wrapper.</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>

        <SidebarProvider>
          <div className="flex h-48 overflow-hidden rounded-md border border-zinc-200">
            <Sidebar collapsible="none" className="w-48 border-r">
              <SidebarHeader>Sidebar</SidebarHeader>
              <SidebarContent>
                <SidebarGroup>
                  <SidebarGroupLabel>Menu</SidebarGroupLabel>
                  <SidebarMenu>
                    <SidebarMenuItem><SidebarMenuButton>Dashboard</SidebarMenuButton></SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroup>
              </SidebarContent>
              <SidebarFooter><SidebarTrigger>Toggle</SidebarTrigger></SidebarFooter>
            </Sidebar>
          </div>
        </SidebarProvider>

        <div className="flex items-center gap-2 rounded-md border border-zinc-200 p-3">
          <Spinner /> spinner
        </div>

        <div className="space-y-2 rounded-md border border-zinc-200 p-3">
          <TypographyH3>Typography</TypographyH3>
          <TypographyP>Paragraph text renders.</TypographyP>
          <TypographyBlockquote>Blockquote text renders.</TypographyBlockquote>
          <TypographyMuted>Muted text renders.</TypographyMuted>
        </div>
      </div>
    </div>
  );
}
`,
  },
];

export default async function PreviewBaseuiPage() {
  const assembledFiles = toSortedFiles(
    assemblePreviewFiles(baseuiDemoFiles, { uiLibrary: "baseui" }),
  );

  return (
    <div className="h-screen w-screen">
      <a
        href="/preview-baseui/compare?debug=1"
        className="fixed right-4 top-4 z-50 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50"
      >
        Compare native
      </a>
      <SourceInspector
        generatedFiles={baseuiDemoFiles}
        assembledFiles={assembledFiles}
      />
      <CodeRunner files={baseuiDemoFiles} previewKit="baseui" />
    </div>
  );
}

function toSortedFiles(fileMap: Record<string, string>) {
  return Object.entries(fileMap)
    .map(([path, content]) => ({ path, content }))
    .sort((left, right) => {
      const rankDiff = fileRank(left.path) - fileRank(right.path);
      return rankDiff || left.path.localeCompare(right.path);
    });
}

function fileRank(path: string) {
  if (path === "package.json") return -5;
  if (path === "import-map.json") return -4;
  if (path === "main.tsx") return -3;
  if (path === "App.tsx") return -2;
  if (!path.startsWith("components/ui/") && !path.startsWith("lib/utils.ts")) {
    return -1;
  }
  return 0;
}
