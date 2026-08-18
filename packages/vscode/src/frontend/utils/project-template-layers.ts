/**
 * Built-in create-project templates.
 *
 * `native-rust` is the official HarmonyOS Native Rust (ohos-rs) delta layered
 * on top of `empty-ability` (same form fields, plus Cargo/NAPI files).
 */
export const CREATE_PROJECT_TEMPLATE_LAYERS: Record<string, readonly string[]> = {
  'empty-ability': ['empty-ability'],
  'native-rust': ['empty-ability', 'native-rust'],
}

export function resolveProjectTemplateLayers(templateName: string): readonly string[] {
  return CREATE_PROJECT_TEMPLATE_LAYERS[templateName] ?? [templateName]
}
