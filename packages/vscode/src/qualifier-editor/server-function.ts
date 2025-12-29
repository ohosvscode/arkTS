import { BirpcReturn } from 'birpc'
import { Service } from 'unioc'
import { QualifierEditorConnectionProtocol } from './interfaces/connection-protocol'

@Service
export class QualifierEditorServerFunctionImpl implements QualifierEditorConnectionProtocol.ServerFunction {
  onRpcInitialized(_connection: BirpcReturn<QualifierEditorConnectionProtocol.ClientFunction, QualifierEditorConnectionProtocol.ServerFunction>): void {}
}
