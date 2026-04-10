---
"@arkts/language-service": patch
---

fix: fix `json`/`json5` -> `.ets` goto definition

> Principle: Use a Set to collect all LanguageService instances and obtain all SourceFile objects.
> Because the volar language server creates multiple LanguageService/LanguageServiceHost instances, but not expose API to get all LanguageService/LanguageServiceHost instances, so we need create a Set by ourselves to collect all LanguageService instances.