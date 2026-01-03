import { MyCustomComponent } from 'sample-library'
import {} from '@kit.ArkData'

class MyLazyDataSource implements IDataSource {
  getData(index: number): number {
    return index + 1;
  }

  totalCount(): number {
    return 100;
  }

  registerDataChangeListener(_listener: DataChangeListener): void {
    // Implement data change listener registration if needed
  }

  unregisterDataChangeListener(_listener: DataChangeListener): void {
    // Implement data change listener unregistration if needed
  }
}

export @interface MyAnnotation {
  hello: string = "world"
}

@MyAnnotation
class MyClass {}

@Entry
@Component
export struct Index {
  @State message: string = 'Hello World';
  testESObject: ESObject = 'Hello ESObject';

  build() {
    Row() {
      Column() {
        Text($r('app.string.EntryAbility_label'))
          .fontSize(50)
          .fontWeight(FontWeight.Bold)
          .textAlign(TextAlign.Center)
          .fontColor($r('app.string.EntryAbility_desc'))

        Text($r('app.string.EntryAbility_label'))
          .fontSize(20)
          .fontColor($r('app.color.primary_color'))
          .margin({ top: 10 })

        Text(this.message)
          .fontSize(30)
          .fontWeight(FontWeight.Bold)
          .textAlign(TextAlign.Center)
          .margin({ top: 20 })

        Image($r('app.media.startIcon'))

        MyCustomComponent()
      }.width('100%')
        .height(200)
        .accessibilityDescription('Test')
        .align(Alignment.Center)

      ForEach([1, 2, 3, 4], (item: number) => {
        Column() {
          Row() {
            Text(item.toString())
              .fontColor($r('sys.symbol.fund'))
          }.margin(10)
          .height(20)
        }
      })

      LazyForEach(new MyLazyDataSource(), (item: number) => {
        Column() {
          Row() {
            Text(item.toString())
            Text().backgroundColor($r('app.color.secondary_color'))
          }
        }
      })
    }.height('100%')
      .backgroundColor($r('app.color.start_window_background'))
  }
}
