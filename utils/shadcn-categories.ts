export const shadcnCategories = {
  form: {
    name: "Form Components",
    components: ["Input", "Textarea", "Select", "Checkbox", "RadioGroup", "Switch", "Label"],
  },
  layout: {
    name: "Layout Components",
    components: ["Card", "Avatar", "Button"],
  },
  feedback: {
    name: "Feedback Components",
    components: ["Toast", "Alert", "Dialog", "Progress"],
  },
  navigation: {
    name: "Navigation Components",
    components: ["Tabs", "NavigationMenu", "Breadcrumb"],
  },
};

export type ShadcnCategory = keyof typeof shadcnCategories;
