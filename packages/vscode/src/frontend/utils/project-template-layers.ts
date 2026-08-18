/**
 * Built-in create-project templates.
 *
 * `native-cpp` is the official HarmonyOS Native C++ delta layered on top of
 * `empty-ability` (same form fields, plus NAPI/CMake files).
 */
export const CREATE_PROJECT_TEMPLATE_LAYERS: Record<string, readonly string[]> = {
  'empty-ability': ['empty-ability'],
  'native-cpp': ['empty-ability', 'native-cpp'],
}

export function resolveProjectTemplateLayers(templateName: string): readonly string[] {
  return CREATE_PROJECT_TEMPLATE_LAYERS[templateName] ?? [templateName]
}
