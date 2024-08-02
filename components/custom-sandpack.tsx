import { Sandpack } from "@codesandbox/sandpack-react";

type CustomSandpackProps = {
  code: string;
};
const CustomSandpack = (code: CustomSandpackProps) => {
  return (
    <Sandpack
      template="react-ts"
      // theme={theme.palette.mode}
      files={{
        ["something.tsx"]: { code, active: true },
      }}
      options={{
        showLineNumbers: true,
        showInlineErrors: true,
        showTabs: false,
        closableTabs: false,
      }}
    />
  );
};

export default CustomSandpack;
