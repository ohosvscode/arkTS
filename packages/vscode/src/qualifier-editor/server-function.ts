import { BirpcReturn } from 'birpc'
import { Autowired, Service } from 'unioc'
import { ProtocolContext } from '../context/protocol-context'
import { Translator } from '../translate'
import { QualifierEditorConnectionProtocol } from './interfaces/connection-protocol'

@Service
export class QualifierEditorServerFunctionImpl extends ProtocolContext implements QualifierEditorConnectionProtocol.ServerFunction {
  @Autowired
  protected readonly translator: Translator

  onRpcInitialized(_connection: BirpcReturn<QualifierEditorConnectionProtocol.ClientFunction, QualifierEditorConnectionProtocol.ServerFunction>): void {}
}
