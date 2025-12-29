import type * as vscode from 'vscode'
import type { WebviewContext } from '../../context/webview-context'

export namespace ProjectConnectionProtocol {
  export namespace File {
    export interface Stat {
      isFile: boolean
      isDirectory: boolean
    }
  }

  export interface ServerFunction extends WebviewContext.ServerFunction<ClientFunction, ServerFunction> {
    /**
     * Check if the path exists
     *
     * @param path - The path to check
     * @returns True if the path exists, false otherwise
     */
    stat(path: string): Promise<false | File.Stat>
    /**
     * Read the directory.
     *
     * @param path - The path to read.
     * @returns The directory contents.
     */
    readDirectory(path: string): Promise<false | string[]>
    /**
     * Get the home directory
     *
     * @returns The home directory
     */
    getHomeDirectory(): Promise<string>
    /**
     * Find all l10n by current language
     *
     * @returns All l10n map by current language
     */
    findAllL10nByCurrentLanguage(): Promise<Record<string, string>>
    /**
     * Request template market list.
     *
     * @param request - The request object.
     * @returns The response object.
     */
    requestTemplateMarketList(request?: ServerFunction.RequestTemplateMarketList.Request): Promise<ServerFunction.RequestTemplateMarketList.Response>
    /**
     * Request template market detail.
     *
     * @param productId - The product id.
     * @returns The response object.
     */
    requestTemplateMarketDetail(productId: string): Promise<ServerFunction.RequestTemplateMarketDetail.Response>
    /**
     * Create an open dialog.
     *
     * @returns The response object.
     */
    createOpenDialog(options?: ServerFunction.CreateOpenDialog.Options): Promise<string>
    /**
     * Download and extract template.
     *
     * @param url - The url of the template.
     * @returns The response object.
     */
    downloadAndExtractTemplate(url: string): Promise<void>
    /**
     * Create a project.
     *
     * @param context - The context object for compile handlebars template.
     * @param templateName - The template name in the `packages/vscode/templates` directory.
     * @param savePath - The save path for the project.
     * @returns The response object.
     */
    createProject(context: Record<string, string | number | boolean | string[]>, templateName: string, savePath: string): Promise<void>
  }

  export namespace ServerFunction {
    export namespace CreateOpenDialog {
      export interface Options extends Omit<vscode.OpenDialogOptions, 'defaultUri'> {}
    }
    /**
     * The request template market list namespace.
     *
     * @see {@linkcode ProjectConnectionProtocol.ServerFunction.RequestTemplateMarketList}
     */
    export namespace RequestTemplateMarketList {
      /**
       * The `requestTemplateMarketList` request object.
       *
       * @see {@linkcode ProjectConnectionProtocol.ServerFunction.requestTemplateMarketList}
       */
      export interface Request {
        /**
         * The page index.
         *
         * @default 1
         */
        pageIndex?: number
        /**
         * The page size.
         *
         * @default 10
         */
        pageSize?: number
        /**
         * The extra parameters.
         */
        [key: string]: any
      }

      export interface Response {
        code: number
        message: string
        resultList: Response.Result[]
        totalCount: number
      }

      export namespace Response {
        export interface Result {
          productId: string
          productName: string
          briefInfo: string
          companyName?: string
          productPublicizePicList?: Result.ProductPublicizePic[]
          updateTime: string
          score: string
          version: string
          licenseName?: string
          saleNum: number
        }

        export namespace Result {
          export interface ProductPublicizePic {
            picUrl: string
            picName: string
          }

          export namespace ProductPublicizePic {
            export function is(value: unknown): value is ProductPublicizePic {
              return typeof value === 'object'
                && value !== null
                && 'picUrl' in value
                && typeof value.picUrl === 'string'
                && 'picName' in value
                && typeof value.picName === 'string'
            }
          }

          export function is(value: unknown): value is Result {
            return typeof value === 'object'
              && value !== null
              && 'productId' in value
              && typeof value.productId === 'string'
              && 'productName' in value
              && typeof value.productName === 'string'
              && 'briefInfo' in value
              && typeof value.briefInfo === 'string'
              && (!('companyName' in value) || typeof value.companyName === 'string')
              && (!('productPublicizePicList' in value) || (Array.isArray(value.productPublicizePicList) && value.productPublicizePicList.every(item => Result.ProductPublicizePic.is(item))))
              && 'updateTime' in value
              && typeof value.updateTime === 'string'
              && 'score' in value
              && typeof value.score === 'string'
              && 'version' in value
              && typeof value.version === 'string'
              && (!('licenseName' in value) || typeof value.licenseName === 'string')
              && 'saleNum' in value
              && typeof value.saleNum === 'number'
          }
        }

        export function is(value: unknown): value is Response {
          return typeof value === 'object'
            && value !== null
            && 'code' in value
            && typeof value.code === 'number'
            && 'message' in value
            && typeof value.message === 'string'
            && 'resultList' in value
            && Array.isArray(value.resultList)
            && value.resultList.every(Result.is)
            && 'totalCount' in value
            && typeof value.totalCount === 'number'
        }
      }
    }

    export namespace RequestTemplateMarketDetail {
      export interface Response {
        code: number
        result: Response.Result
      }

      export namespace Response {
        export interface Result {
          productEntity: Result.ProductEntity
          productPublicizePicList?: Result.ProductPublicizePic[]
          productTemplateList?: Result.ProductTemplate[]
        }

        export namespace Result {
          export interface ProductTemplate {
            /**
             * The product template version.
             */
            version: string
            /**
             * The product template changelog.
             */
            desc: string
            /**
             * The product template file url, is a `.zip` file.
             */
            fileUrl: string
          }

          export interface ProductPublicizePic {
            picUrl: string
          }

          export namespace ProductPublicizePic {
            export function is(value: unknown): value is ProductPublicizePic {
              return typeof value === 'object'
                && value !== null
                && 'picUrl' in value
                && typeof value.picUrl === 'string'
            }
          }

          export interface ProductEntity {
            /**
             * The product name.
             */
            productName: string
            /**
             * The company name.
             */
            companyName: string
            /**
             * The product id.
             */
            id: string
            /**
             * The product details in markdown format.
             */
            details: string
            /**
             * The detail files in json format.
             */
            detailFiles: string
            /**
             * The product brief information.
             */
            briefInfo: string
            /**
             * The product license name.
             */
            licenseName: string
            /**
             * The product update time.
             */
            updateTime: string
            /**
             * The product score.
             */
            score: number
            /**
             * The product sale num.
             */
            saleNum: number
          }

          export namespace DetailFile {
            export interface Image {
              /**
               * The image file name.
               */
              fileName: string
              /**
               * The image file path.
               */
              filePath: string
            }
          }

          export interface DetailFile {
            image?: DetailFile.Image[]
          }

          export function is(value: unknown): value is Result {
            return typeof value === 'object'
              && value !== null
              && 'productEntity' in value
              && Result.ProductEntity.is(value.productEntity)
              && (!('productPublicizePicList' in value) || (Array.isArray(value.productPublicizePicList) && value.productPublicizePicList.every(Result.ProductPublicizePic.is)))
          }

          export namespace ProductEntity {
            export function is(value: unknown): value is ProductEntity {
              return typeof value === 'object'
                && value !== null
                && 'id' in value
                && typeof value.id === 'string'
                && 'details' in value
                && typeof value.details === 'string'
                && 'briefInfo' in value
                && typeof value.briefInfo === 'string'
            }
          }
        }

        export function is(value: unknown): value is Response {
          return typeof value === 'object'
            && value !== null
            && 'code' in value
            && typeof value.code === 'number'
            && 'result' in value
            && Result.is(value.result)
        }
      }
    }
  }

  export interface ClientFunction {
    onOpenDialog(dialogId: string, uri: string[] | undefined): void
  }
}
