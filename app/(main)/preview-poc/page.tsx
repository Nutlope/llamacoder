import CodeRunner from "@/components/code-runner";
import { assemblePreviewFiles } from "@/lib/preview/files";
import Link from "next/link";
import SourceInspector from "./source-inspector";

type PreviewCase = "gauntlet" | "syntax-error" | "missing-import";
type PreviewParams = {
  case?: string;
  debug?: string;
  preview?: string;
};

export const dynamic = "force-dynamic";

const gauntletFiles = [
  {
    path: "src/App.tsx",
    content: `import React from "react";
import DashboardShell from "./components/DashboardShell";

export default function App() {
  return <DashboardShell />;
}
`,
  },
  {
    path: "src/components/DashboardShell.tsx",
    content: `import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { CompatibilitySummary, ErrorLab, StorageLab } from "./compat";
import InteractionCard from "./InteractionCard";
import MetricChart from "./MetricChart";
import MotionLab from "./MotionLab";
import RadixLab from "./RadixLab";
import { chartData, summaryStats } from "../data/chart-data";
import { formatDelta } from "../lib/format";
import "../styles/gauntlet.css";

export default function DashboardShell() {
  const formattedDate = format(new Date(2026, 6, 2), "PPPP", {
    locale: enUS,
  });

  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-950">
      <div className="mx-auto grid max-w-6xl gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="gauntlet-panel rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-emerald-100 p-2 text-emerald-700">
              <Sparkles className="size-5" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold">WASM ESM compatibility gauntlet</h1>
              <p className="text-sm text-zinc-500">
                Recharts, Radix, motion, date-fns locale imports, CSS imports,
                aliases, index imports, and sandbox storage.
              </p>
            </div>
          </div>

          <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            date-fns/locale subpath import: {formattedDate}
          </p>

          <MetricChart data={chartData} />

          <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
            {summaryStats.map((stat) => (
              <div key={stat.label} className="rounded-md bg-zinc-100 p-3">
                <dt className="text-zinc-500">{stat.label}</dt>
                <dd className="mt-1 font-semibold">{formatDelta(stat.value)}</dd>
              </div>
            ))}
          </dl>

          <CompatibilitySummary />
        </motion.section>

        <div className="space-y-5">
          <InteractionCard />
          <RadixLab />
          <MotionLab />
          <StorageLab />
          <ErrorLab />
        </div>
      </div>
    </main>
  );
}
`,
  },
  {
    path: "src/components/compat/index.tsx",
    content: `import React from "react";
import { AlertTriangle, CheckCircle2, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CompatibilitySummary() {
  const checks = [
    "Multi-file relative imports",
    "Alias imports from @/components/ui/*",
    "Index import from ./components/compat",
    "date-fns/locale subpath import",
    "CSS file import",
  ];

  return (
    <div className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
      {checks.map((check) => (
        <div key={check} className="flex items-center gap-2 rounded-md border border-emerald-100 bg-white px-3 py-2 text-emerald-900">
          <CheckCircle2 className="size-4 text-emerald-600" />
          {check}
        </div>
      ))}
    </div>
  );
}

export function StorageLab() {
  const localKey = "preview-local-count";
  const sessionKey = "preview-session-count";
  const [localCount, setLocalCount] = React.useState(() =>
    Number(window.localStorage.getItem(localKey) || "0"),
  );
  const [sessionCount, setSessionCount] = React.useState(() =>
    Number(window.sessionStorage.getItem(sessionKey) || "0"),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="size-5 text-emerald-700" />
          Storage lab
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button
          onClick={() => {
            const next = localCount + 1;
            window.localStorage.setItem(localKey, String(next));
            setLocalCount(next);
          }}
        >
          localStorage {localCount}
        </Button>
        <Button
          onClick={() => {
            const next = sessionCount + 1;
            window.sessionStorage.setItem(sessionKey, String(next));
            setSessionCount(next);
          }}
        >
          sessionStorage {sessionCount}
        </Button>
      </CardContent>
    </Card>
  );
}

export function ErrorLab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-amber-600" />
          Runtime error lab
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button
          onClick={() => {
            setTimeout(() => {
              throw new Error("Intentional runtime error from ErrorLab");
            }, 0);
          }}
        >
          Throw runtime error
        </Button>
        <Button
          onClick={() => {
            Promise.reject(new Error("Intentional unhandled rejection"));
          }}
        >
          Reject promise
        </Button>
      </CardContent>
    </Card>
  );
}
`,
  },
  {
    path: "src/components/RadixLab.tsx",
    content: `import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RadixLab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Radix lab</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dialog rendered</DialogTitle>
              <DialogDescription>
                Portal, focus management, overlay, and iframe sandbox are working.
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        <Popover>
          <PopoverTrigger asChild>
            <Button>Open popover</Button>
          </PopoverTrigger>
          <PopoverContent className="text-sm">
            Popover content positioned by Radix inside the preview iframe.
          </PopoverContent>
        </Popover>

        <Select defaultValue="wasm">
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Renderer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="wasm">WASM preview</SelectItem>
            <SelectItem value="sandpack">Sandpack</SelectItem>
            <SelectItem value="native">Native ESM</SelectItem>
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
`,
  },
  {
    path: "src/components/MotionLab.tsx",
    content: `import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Shuffle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const colors = ["bg-emerald-500", "bg-sky-500", "bg-fuchsia-500"];

export default function MotionLab() {
  const [isStacked, setIsStacked] = React.useState(false);
  const [spin, setSpin] = React.useState(0);
  const [items, setItems] = React.useState([0, 1, 2]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5 text-emerald-700" />
          Motion lab
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setIsStacked((value) => !value)}>
            Toggle layout
          </Button>
          <Button onClick={() => setSpin((value) => value + 90)}>
            Rotate
          </Button>
          <Button
            onClick={() =>
              setItems((value) => (value.length === 3 ? [0, 2] : [0, 1, 2]))
            }
          >
            <Shuffle className="mr-2 size-4" />
            Swap items
          </Button>
        </div>

        <motion.div
          layout
          className={isStacked ? "grid gap-2" : "grid grid-cols-3 gap-2"}
        >
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.div
                layout
                key={item}
                initial={{ opacity: 0, scale: 0.8, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0, rotate: spin }}
                exit={{ opacity: 0, scale: 0.7, y: -12 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className={[colors[item], "flex h-16 items-center justify-center rounded-md font-semibold text-white shadow-sm"].join(" ")}
              >
                {item + 1}
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </CardContent>
    </Card>
  );
}
`,
  },
  {
    path: "src/components/MetricChart.tsx",
    content: `import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartPoint } from "../data/chart-data";

export default function MetricChart({ data }: { data: Array<ChartPoint> }) {
  return (
    <div className="mt-6 h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="#059669" strokeWidth={3} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
`,
  },
  {
    path: "src/components/InteractionCard.tsx",
    content: `import React from "react";
import { Activity } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InteractionCard() {
  const [count, setCount] = React.useState(() => {
    return Number(window.localStorage.getItem("preview-count") || "0");
  });

  React.useEffect(() => {
    window.localStorage.setItem("preview-count", String(count));
  }, [count]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="size-5 text-emerald-700" />
          Interaction check
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <Button onClick={() => setCount((value) => value + 1)}>
          Count {count}
        </Button>

        <Accordion type="single" collapsible>
          <AccordionItem value="result">
            <AccordionTrigger>What should this prove?</AccordionTrigger>
            <AccordionContent>
              If this renders and the counter works, the POC resolved imports
              across multiple generated files, injected shadcn/ui files, loaded
              npm dependencies through the import map, and kept generated code
              isolated from the parent page.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
`,
  },
  {
    path: "src/data/chart-data.ts",
    content: `export type ChartPoint = {
  name: string;
  value: number;
};

export const chartData: Array<ChartPoint> = [
  { name: "Mon", value: 14 },
  { name: "Tue", value: 28 },
  { name: "Wed", value: 22 },
  { name: "Thu", value: 44 },
  { name: "Fri", value: 36 },
];

export const summaryStats = [
  { label: "Build", value: 44 },
  { label: "Warm", value: 12 },
  { label: "Errors", value: 0 },
];
`,
  },
  {
    path: "src/lib/format.ts",
    content: `export function formatDelta(value: number): string {
  return value === 0 ? "0" : "+" + value.toLocaleString();
}
`,
  },
  {
    path: "src/styles/gauntlet.css",
    content: `.gauntlet-panel {
  background-image:
    linear-gradient(rgba(16, 185, 129, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(16, 185, 129, 0.08) 1px, transparent 1px);
  background-size: 20px 20px;
}
`,
  },
];

const syntaxErrorFiles = [
  {
    path: "src/App.tsx",
    content: `export default function App() {
  return <main className="p-6">This file intentionally has a syntax error</main>
`,
  },
];

const missingImportFiles = [
  {
    path: "src/App.tsx",
    content: `import MissingWidget from "definitely-not-installed";

export default function App() {
  return <MissingWidget />;
}
`,
  },
];

const cases: Record<PreviewCase, Array<{ path: string; content: string }>> = {
  gauntlet: gauntletFiles,
  "syntax-error": syntaxErrorFiles,
  "missing-import": missingImportFiles,
};

const caseLabels: Record<PreviewCase, string> = {
  gauntlet: "Compatibility gauntlet",
  "syntax-error": "Syntax error",
  "missing-import": "Missing import",
};

export default async function PreviewPocPage({
  searchParams,
}: {
  searchParams: Promise<PreviewParams>;
}) {
  const params = await searchParams;
  const activeCase = isPreviewCase(params.case) ? params.case : "gauntlet";
  const files = cases[activeCase];
  const assembledFiles = toSortedFiles(assemblePreviewFiles(files));

  return (
    <div className="h-screen w-screen">
      <CaseSwitcher activeCase={activeCase} params={params} />
      <SourceInspector generatedFiles={files} assembledFiles={assembledFiles} />
      <CodeRunner files={files} />
    </div>
  );
}

function CaseSwitcher({
  activeCase,
  params,
}: {
  activeCase: PreviewCase;
  params: PreviewParams;
}) {
  const activePreview = params.preview === "wasm" ? "wasm" : "sandpack";

  return (
    <nav className="fixed right-4 top-4 z-[60] flex max-w-[calc(100vw-2rem)] flex-wrap justify-end gap-2">
      <div className="flex overflow-hidden rounded-md border border-zinc-300 bg-white shadow-sm">
        {(["sandpack", "wasm"] as const).map((preview) => (
          <Link
            key={preview}
            href={buildHref(params, { preview })}
            className={`px-3 py-2 text-xs font-medium ${
              activePreview === preview
                ? "bg-zinc-900 text-white"
                : "text-zinc-800 hover:bg-zinc-50"
            }`}
          >
            {preview === "wasm" ? "WASM" : "Sandpack"}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        {Object.entries(caseLabels).map(([value, label]) => (
          <Link
            key={value}
            href={buildHref(params, {
              case: value === "gauntlet" ? undefined : value,
            })}
            className={`rounded-md border px-3 py-2 text-xs font-medium shadow-sm ${
              activeCase === value
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

function isPreviewCase(value: string | undefined): value is PreviewCase {
  return (
    value === "gauntlet" ||
    value === "syntax-error" ||
    value === "missing-import"
  );
}

function buildHref(
  params: PreviewParams,
  updates: {
    case?: string;
    preview?: string;
  },
) {
  const query = new URLSearchParams();
  if (params.preview) query.set("preview", params.preview);
  if (params.case) query.set("case", params.case);
  if (params.debug) query.set("debug", params.debug);

  for (const [key, value] of Object.entries(updates)) {
    if (value) query.set(key, value);
    else query.delete(key);
  }

  const queryString = query.toString();
  return `/preview-poc${queryString ? `?${queryString}` : ""}`;
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
