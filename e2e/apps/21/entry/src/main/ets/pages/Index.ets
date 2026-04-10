@Entry
@Component
struct Index {
  @State message: string = "Hello World";

  build() {
    RelativeContainer() {
      Text(this.message)
        .id("HelloWorld")
        .fontSize($r("app.color.start_window_background"))
        .fontWeight(FontWeight.Bold)
        .alignRules({
          center: { anchor: "__container__", align: VerticalAlign.Center },
          middle: { anchor: "__container__", align: HorizontalAlign.Center },
        })
        .onClick(() => {
          this.message = this.message === "Hello World" ? "Welcome" : "Hello World";
        })
    }
    .height("100%")
    .width("100%")
  }
}
